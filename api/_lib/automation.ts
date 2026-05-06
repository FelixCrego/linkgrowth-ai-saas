import { optionalEnv } from "./env.js";
import { sql } from "./db.js";
import { generateText, generateWebResearchJson } from "./openai.js";
import { publishLinkedInPost } from "./linkedin.js";

type AutomationSettingsRow = {
  workspace_id: string;
  user_id: string;
  enabled: boolean;
  auto_publish: boolean;
  posts_per_day: number;
  seed_prompt: string;
};

type OnboardingRow = {
  niche: string;
  industry: string;
  target_audience: string;
  tone: string;
  frequency: string;
};

type LinkedInRow = {
  access_token: string;
  linkedin_member_urn: string;
};

type DeepResearchPack = {
  focusTopic: string;
  trendingTopics: string[];
  painPoints: string[];
  controversialAngles: string[];
  hookIdeas: string[];
  keywords: string[];
  recommendedAngle: string;
};

export type WorkspaceAutomationResult = {
  workspaceId: string;
  generated: number;
  published: number;
  skipped: boolean;
  reason?: string;
  error?: string;
};

let schemaReady = false;

export async function ensureAutomationTables(): Promise<void> {
  if (schemaReady) return;
  await sql(`
    create table if not exists automation_settings (
      workspace_id uuid primary key references workspaces(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      enabled boolean not null default false,
      auto_publish boolean not null default false,
      posts_per_day integer not null default 3 check (posts_per_day between 1 and 20),
      seed_prompt text not null default '',
      last_run_at timestamptz,
      last_error text,
      updated_at timestamptz not null default now()
    );
  `);
  await sql("create index if not exists idx_automation_settings_enabled on automation_settings(enabled)");
  schemaReady = true;
}

function normalizeLinkedInText(value: string): string {
  let text = value;
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function defaultSeedPrompt(onboarding?: OnboardingRow): string {
  if (!onboarding) return "Create a high-engagement LinkedIn post using current market trends.";
  return `Create a high-engagement LinkedIn post for ${onboarding.industry} about ${onboarding.niche}, targeting ${onboarding.target_audience}.`;
}

async function generateOnePost(
  workspaceId: string,
  userId: string,
  prompt: string,
  onboarding?: OnboardingRow
): Promise<{ content: string; research: DeepResearchPack }> {
  const context = onboarding
    ? `Niche: ${onboarding.niche}
Industry: ${onboarding.industry}
Target Audience: ${onboarding.target_audience}
Preferred Tone: ${onboarding.tone}
Posting Frequency: ${onboarding.frequency}`
    : "Niche context is unavailable for this workspace.";

  const researchResult = await generateWebResearchJson<DeepResearchPack>(
    "Return JSON only with keys: focusTopic, trendingTopics (array), painPoints (array), controversialAngles (array), hookIdeas (array), keywords (array), recommendedAngle. No markdown.",
    `You are doing live, web-backed research for LinkedIn content automation.
Business Context:
${context}

Prompt:
${prompt}

Return specific, current, high-engagement research signals.`,
    { requireSources: true }
  );

  const research = researchResult.data;
  const contentRaw = await generateText(
    "You are a LinkedIn growth copywriter. Write plain text only (no markdown) with strong hook, concise body, CTA, and 3 hashtags.",
    `Business Context:
${context}

Prompt:
${prompt}

Deep Research Signals:
Focus Topic: ${research.focusTopic}
Trending Topics: ${(research.trendingTopics ?? []).join(" | ")}
Pain Points: ${(research.painPoints ?? []).join(" | ")}
Controversial Angles: ${(research.controversialAngles ?? []).join(" | ")}
Hook Ideas: ${(research.hookIdeas ?? []).join(" | ")}
Keywords: ${(research.keywords ?? []).join(" | ")}
Recommended Angle: ${research.recommendedAngle}`
  );

  const content = normalizeLinkedInText(contentRaw);

  await sql("insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)", [
    workspaceId,
    userId,
    `automation:${prompt}`,
    JSON.stringify(research),
  ]);

  await sql("insert into generated_posts (workspace_id, user_id, prompt, content) values ($1, $2, $3, $4)", [
    workspaceId,
    userId,
    prompt,
    content,
  ]);

  return { content, research };
}

export async function runWorkspaceAutomation(
  workspaceId: string,
  options?: { forceCount?: number; overrideUserId?: string }
): Promise<WorkspaceAutomationResult> {
  await ensureAutomationTables();

  const settingsRes = await sql<AutomationSettingsRow>(
    "select workspace_id, user_id, enabled, auto_publish, posts_per_day, seed_prompt from automation_settings where workspace_id = $1 limit 1",
    [workspaceId]
  );
  const settings = settingsRes.rows[0];
  if (!settings) {
    return { workspaceId, generated: 0, published: 0, skipped: true, reason: "Automation settings not configured" };
  }
  if (!settings.enabled && !options?.forceCount) {
    return { workspaceId, generated: 0, published: 0, skipped: true, reason: "Automation disabled" };
  }

  const userId = options?.overrideUserId ?? settings.user_id;
  const onboardingRes = await sql<OnboardingRow>(
    "select niche, industry, target_audience, tone, frequency from onboarding_profiles where workspace_id = $1 limit 1",
    [workspaceId]
  );
  const onboarding = onboardingRes.rows[0];
  const seedPrompt = settings.seed_prompt?.trim() || defaultSeedPrompt(onboarding);

  const targetDaily = options?.forceCount ?? settings.posts_per_day;
  const todayRes = await sql<{ count: number }>(
    "select count(*)::int as count from generated_posts where workspace_id = $1 and created_at >= date_trunc('day', now(), 'UTC')",
    [workspaceId]
  );
  const todayCount = todayRes.rows[0]?.count ?? 0;
  const toGenerate = Math.max(0, targetDaily - todayCount);
  if (toGenerate === 0) {
    await sql("update automation_settings set last_run_at = now(), last_error = null, updated_at = now() where workspace_id = $1", [workspaceId]);
    return { workspaceId, generated: 0, published: 0, skipped: true, reason: "Daily quota already satisfied" };
  }

  let generated = 0;
  let published = 0;

  try {
    const accountRes = await sql<LinkedInRow>(
      "select access_token, linkedin_member_urn from linkedin_accounts where workspace_id = $1 limit 1",
      [workspaceId]
    );
    const linkedin = accountRes.rows[0];

    for (let i = 0; i < toGenerate; i += 1) {
      const numberedPrompt = `${seedPrompt}\n\nBatch item ${i + 1} of ${toGenerate}. Ensure this post is distinct from earlier items.`;
      const result = await generateOnePost(workspaceId, userId, numberedPrompt, onboarding);
      generated += 1;

      if (settings.auto_publish && linkedin) {
        const publishResult = await publishLinkedInPost(
          linkedin.access_token,
          linkedin.linkedin_member_urn,
          result.content
        );
        await sql(
          "insert into linkedin_post_events (workspace_id, user_id, content, has_image, post_urn) values ($1, $2, $3, $4, $5)",
          [workspaceId, userId, result.content, false, publishResult.postUrn]
        );
        published += 1;
      }
    }

    await sql("update automation_settings set last_run_at = now(), last_error = null, updated_at = now() where workspace_id = $1", [workspaceId]);
    return { workspaceId, generated, published, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed";
    await sql("update automation_settings set last_run_at = now(), last_error = $2, updated_at = now() where workspace_id = $1", [
      workspaceId,
      message,
    ]);
    return { workspaceId, generated, published, skipped: false, error: message };
  }
}

export async function runAllEnabledAutomations(): Promise<WorkspaceAutomationResult[]> {
  await ensureAutomationTables();
  const maxWorkspaces = Number(optionalEnv("AUTOMATION_MAX_WORKSPACES_PER_RUN") ?? "25");
  const rows = await sql<{ workspace_id: string }>(
    "select workspace_id::text as workspace_id from automation_settings where enabled = true order by updated_at asc limit $1",
    [maxWorkspaces]
  );

  const results: WorkspaceAutomationResult[] = [];
  for (const row of rows.rows) {
    // Sequential by design to avoid API burst and LinkedIn rate-limit spikes.
    // eslint-disable-next-line no-await-in-loop
    const result = await runWorkspaceAutomation(row.workspace_id);
    results.push(result);
  }

  return results;
}
