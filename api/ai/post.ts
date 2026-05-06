import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateText, generateWebResearchJson, type WebSource } from "../_lib/openai.js";
import { getWorkspaceSubscription } from "../_lib/subscription.js";

const postTypeSchema = z.enum([
  "thought_leadership",
  "how_to",
  "story",
  "case_study",
  "contrarian",
  "listicle",
]);

const schema = z.object({
  prompt: z.string().min(5),
  postType: postTypeSchema.optional(),
  tone: z.string().min(2).max(80).optional(),
  voiceStyle: z.string().min(2).max(120).optional(),
  regenerateFrom: z.string().min(20).optional(),
});

type PostType = z.infer<typeof postTypeSchema>;

type OnboardingRow = {
  niche: string;
  industry: string;
  target_audience: string;
  tone: string;
  frequency: string;
};

type VoiceProfileRow = {
  profile_json: {
    tone?: string;
    style?: string;
    lengthPreference?: string;
    emojiUsage?: string;
    hookStrategy?: string;
  };
};

type DeepResearchPack = {
  focusTopic: string;
  trendingTopics: string[];
  painPoints: string[];
  controversialAngles: string[];
  hookIdeas: string[];
  keywords: string[];
  recommendedAngle: string;
  imageSuggestions: Array<{
    title: string;
    prompt: string;
    reason: string;
  }>;
  sources?: WebSource[];
};

function postTypeInstruction(postType: PostType): string {
  if (postType === "thought_leadership") return "Format as a thought leadership post with a strong perspective and one sharp insight.";
  if (postType === "how_to") return "Format as a how-to post with clear steps and practical execution guidance.";
  if (postType === "story") return "Format as a short narrative story post with a lesson and business takeaway.";
  if (postType === "case_study") return "Format as a mini case study with context, action, and measurable outcome.";
  if (postType === "contrarian") return "Format as a contrarian hot-take post that challenges a common belief with evidence.";
  return "Format as a listicle post with concise, high-value bullet points.";
}

function isOpenClawContext(value: string): boolean {
  return /\bopen[\s-]?claw\b/i.test(value);
}

function mentionsOpenClaw(value: string): boolean {
  return /\bopen[\s-]?claw\b/i.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid prompt payload");

    const subscription = await getWorkspaceSubscription(session.workspaceId);
    if (subscription.tier === "starter") {
      const usageRes = await sql<{ count: number }>(
        "select count(*)::int as count from generated_posts where workspace_id = $1 and created_at >= now() - interval '7 days'",
        [session.workspaceId]
      );
      const used = usageRes.rows[0]?.count ?? 0;
      const limit = 3;
      if (used >= limit) {
        return badRequest(res, "Starter plan limit reached (3 posts per 7 days). Upgrade to Pro for unlimited posts.");
      }
    }

    const onboardingRes = await sql<OnboardingRow>(
      "select niche, industry, target_audience, tone, frequency from onboarding_profiles where workspace_id = $1 limit 1",
      [session.workspaceId]
    );
    const onboarding = onboardingRes.rows[0];
    const voiceProfileRes = await sql<VoiceProfileRow>(
      "select profile_json from voice_profiles where workspace_id = $1 order by created_at desc limit 1",
      [session.workspaceId]
    );
    const trainedVoice = voiceProfileRes.rows[0]?.profile_json;

    const context = onboarding
      ? `Niche: ${onboarding.niche}\nIndustry: ${onboarding.industry}\nTarget Audience: ${onboarding.target_audience}\nPreferred Tone: ${onboarding.tone}\nPosting Frequency: ${onboarding.frequency}`
      : "Niche context is unavailable for this workspace.";

    const postType = parsed.data.postType ?? "thought_leadership";
    const selectedTone = parsed.data.tone ?? onboarding?.tone ?? "Professional";
    const selectedVoiceStyle = parsed.data.voiceStyle ?? "Standard";
    const voiceInstruction =
      selectedVoiceStyle === "Trained Voice"
        ? trainedVoice
          ? `Use this trained writing profile as a hard voice constraint: tone="${trainedVoice.tone ?? ""}", style="${trainedVoice.style ?? ""}", lengthPreference="${trainedVoice.lengthPreference ?? ""}", emojiUsage="${trainedVoice.emojiUsage ?? ""}", hookStrategy="${trainedVoice.hookStrategy ?? ""}".`
          : "Trained Voice was selected but no trained profile exists; use a crisp professional voice."
        : `Write in the selected voice style: ${selectedVoiceStyle}.`;
    const variationInstruction = parsed.data.regenerateFrom
      ? `Create a fresh variation that is clearly different from the previous draft below. Use a new opening line, different structure, and different hashtags.\n\nPrevious Draft:\n${parsed.data.regenerateFrom}`
      : "";

    // Step 1: Deep research extraction to avoid generic post outputs.
    const researchResult = await generateWebResearchJson<DeepResearchPack>(
      "Return JSON only with keys: focusTopic, trendingTopics (array), painPoints (array), controversialAngles (array), hookIdeas (array), keywords (array), recommendedAngle, imageSuggestions (array of objects with title, prompt, reason). No markdown.",
      `You are doing live, web-backed market research for LinkedIn content planning.

Research high-engagement LinkedIn conversation patterns for this business context.
Business Context:
${context}

User Seed Prompt:
${parsed.data.prompt}

Hard requirements:
- Return only structured JSON in the requested shape.
- Use current web findings, not generic memory-only advice.
- Prioritize specific topics, pain points, and language used by the actual audience.
- If context references OpenClaw, every major section must stay explicitly relevant to OpenClaw's AI social content workflow.

Return actionable trends, pain points, hooks, and 3 specific image suggestions that would increase post engagement on LinkedIn.`
    );

    const brandContext = `${context}\n${parsed.data.prompt}`;
    const openClawRequired = isOpenClawContext(brandContext);
    const research = {
      ...researchResult.data,
      sources: researchResult.sources,
    };

    await sql("insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)", [
      session.workspaceId,
      session.userId,
      `content-engine:${parsed.data.prompt}`,
      JSON.stringify(research),
    ]);

    let content = await generateText(
      "You are a LinkedIn growth copywriter. Use the provided business context as a hard constraint. Write an engaging LinkedIn post with a strong hook, clear whitespace formatting, tactical insight, a concrete CTA, and 3 relevant hashtags. Avoid generic advice and keep the post specific to the niche and target audience.",
      `Business Context:
${context}

Tone:
Use this tone as a hard constraint: ${selectedTone}.

Voice:
${voiceInstruction}

Post Type:
${postTypeInstruction(postType)}

Deep Research Signals:
Focus Topic: ${research.focusTopic}
Trending Topics: ${(research.trendingTopics ?? []).join(" | ")}
Pain Points: ${(research.painPoints ?? []).join(" | ")}
Controversial Angles: ${(research.controversialAngles ?? []).join(" | ")}
Hook Ideas: ${(research.hookIdeas ?? []).join(" | ")}
Keywords: ${(research.keywords ?? []).join(" | ")}
Recommended Angle: ${research.recommendedAngle}
Web Sources Consulted: ${(research.sources ?? []).map((source) => source.url).join(" | ") || "No live source URLs captured."}

Prompt:
${parsed.data.prompt}

${variationInstruction}`
    );

    if (openClawRequired && !mentionsOpenClaw(content)) {
      content = await generateText(
        "You are a LinkedIn growth copywriter. Follow constraints exactly.",
        `Rewrite this post so it is explicitly and repeatedly about OpenClaw (brand/product), not generic social media advice.

Constraints:
- Mention OpenClaw by name at least 2 times.
- Tie each core point to OpenClaw capabilities (deep research, content engine, workflow automation, analytics, posting execution).
- Keep the chosen tone and post type.
- Keep it concise and engaging for LinkedIn.
- Preserve CTA and include 3 relevant hashtags.

Draft to rewrite:
${content}`
      );
    }

    await sql("insert into generated_posts (workspace_id, user_id, prompt, content) values ($1, $2, $3, $4)", [
      session.workspaceId,
      session.userId,
      parsed.data.prompt,
      content,
    ]);

    sendJson(res, 200, { content, research, researchSources: research.sources ?? [] });
  } catch (error) {
    serverError(res, error);
  }
}
