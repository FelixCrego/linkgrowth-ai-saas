import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateJson, generateText } from "../_lib/openai.js";
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
};

function postTypeInstruction(postType: PostType): string {
  if (postType === "thought_leadership") return "Format as a thought leadership post with a strong perspective and one sharp insight.";
  if (postType === "how_to") return "Format as a how-to post with clear steps and practical execution guidance.";
  if (postType === "story") return "Format as a short narrative story post with a lesson and business takeaway.";
  if (postType === "case_study") return "Format as a mini case study with context, action, and measurable outcome.";
  if (postType === "contrarian") return "Format as a contrarian hot-take post that challenges a common belief with evidence.";
  return "Format as a listicle post with concise, high-value bullet points.";
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
    const research = await generateJson<DeepResearchPack>(
      "Return JSON only with keys: focusTopic, trendingTopics (array), painPoints (array), controversialAngles (array), hookIdeas (array), keywords (array), recommendedAngle, imageSuggestions (array of objects with title, prompt, reason). No markdown.",
      `Research high-engagement LinkedIn conversation patterns for this business context.
Business Context:
${context}

User Seed Prompt:
${parsed.data.prompt}

Return actionable trends, pain points, hooks, and 3 specific image suggestions that would increase post engagement on LinkedIn.`
    );

    await sql("insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)", [
      session.workspaceId,
      session.userId,
      `content-engine:${parsed.data.prompt}`,
      JSON.stringify(research),
    ]);

    const content = await generateText(
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

Prompt:
${parsed.data.prompt}

${variationInstruction}`
    );

    await sql("insert into generated_posts (workspace_id, user_id, prompt, content) values ($1, $2, $3, $4)", [
      session.workspaceId,
      session.userId,
      parsed.data.prompt,
      content,
    ]);

    sendJson(res, 200, { content, research });
  } catch (error) {
    serverError(res, error);
  }
}
