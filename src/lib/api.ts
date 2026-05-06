import { UserPreferences } from "../types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

export type SessionResponse = {
  user: { id: string; email: string; full_name?: string; name?: string };
  workspace: { id: string; name: string; slug: string };
  tier: "starter" | "pro" | "elite";
  subscriptionStatus: string;
  onboarding: UserPreferences | null;
  isOnboarded: boolean;
};

export type DashboardMetricsResponse = {
  linkedin: {
    connected: boolean;
    memberUrn: string | null;
    expiresAt: string | null;
  };
  stats: {
    draftsTotal: number;
    draftsLast7Days: number;
    researchTotal: number;
    researchLast7Days: number;
    postsTotal: number;
    postsLast7Days: number;
  };
  weeklyActivity: Array<{ name: string; activity: number }>;
  recentActivity: Array<{ id: string; label: string; detail: string; createdAt: string }>;
};

export type AutomationSettings = {
  enabled: boolean;
  autoPublish: boolean;
  postsPerDay: number;
  seedPrompt: string;
  lastRunAt: string | null;
  lastError: string | null;
};

export async function signUp(payload: { email: string; password: string; name: string; workspaceName?: string }) {
  return apiFetch("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function login(payload: { email: string; password: string }) {
  return apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export async function me() {
  return apiFetch<SessionResponse>("/api/auth/me", { method: "GET" });
}

export async function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function saveOnboarding(payload: UserPreferences) {
  return apiFetch<{ ok: boolean }>("/api/user/onboarding", { method: "POST", body: JSON.stringify(payload) });
}

export type PostType = "thought_leadership" | "how_to" | "story" | "case_study" | "contrarian" | "listicle";
export type DeepResearchPack = {
  focusTopic: string;
  trendingTopics: string[];
  painPoints: string[];
  controversialAngles: string[];
  hookIdeas: string[];
  keywords: string[];
  recommendedAngle: string;
  imageSuggestions?: Array<{
    title: string;
    prompt: string;
    reason: string;
  }>;
  sources?: Array<{
    title: string;
    url: string;
  }>;
};

export async function generatePost(
  prompt: string,
  options?: { postType?: PostType; tone?: string; voiceStyle?: string; regenerateFrom?: string }
) {
  return apiFetch<{ content: string; research?: DeepResearchPack }>("/api/ai/post", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      postType: options?.postType,
      tone: options?.tone,
      voiceStyle: options?.voiceStyle,
      regenerateFrom: options?.regenerateFrom,
    }),
  });
}

export async function humanizePost(content: string, tone?: string) {
  return apiFetch<{ content: string }>("/api/ai/humanize", {
    method: "POST",
    body: JSON.stringify({ content, tone }),
  });
}

export async function generateImage(prompt: string) {
  return apiFetch<{ imageBase64: string; mimeType: string }>("/api/ai/image", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function research(query: string) {
  return apiFetch<{ trends: Array<{ topic: string; sentiment: string; reach: string; relevance: number; explanation: string }> }>(
    "/api/ai/research",
    { method: "POST", body: JSON.stringify({ query }) }
  );
}

export async function analyzeVoice(trainingData: string) {
  return apiFetch<{ profile: Record<string, string> }>("/api/ai/voice", {
    method: "POST",
    body: JSON.stringify({ trainingData }),
  });
}

export async function createCheckout(tier: "starter" | "pro" | "elite") {
  return apiFetch<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ tier }) });
}

export async function openBillingPortal() {
  return apiFetch<{ url: string }>("/api/billing/portal", { method: "POST" });
}

export async function billingStatus() {
  return apiFetch<{ tier: "starter" | "pro" | "elite"; status: string; currentPeriodEnd: string | null }>("/api/billing/status", {
    method: "GET",
  });
}

export async function linkedinAuthUrl() {
  return apiFetch<{ url: string }>("/api/linkedin/auth-url", { method: "GET" });
}

export async function linkedinStatus() {
  return apiFetch<{ connected: boolean; memberUrn: string | null; expiresAt: string | null }>("/api/linkedin/status", {
    method: "GET",
  });
}

export async function disconnectLinkedin() {
  return apiFetch<{ ok: boolean }>("/api/linkedin/disconnect", { method: "POST" });
}

export async function publishLinkedin(payload: { text: string; postLink?: string; imageBase64?: string; imageMimeType?: string }) {
  return apiFetch<{ ok: boolean }>("/api/linkedin/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAutomationSettings() {
  return apiFetch<AutomationSettings>("/api/automation/settings", { method: "GET" });
}

export async function saveAutomationSettings(payload: {
  enabled: boolean;
  autoPublish: boolean;
  postsPerDay: number;
  seedPrompt?: string;
}) {
  return apiFetch<{ ok: boolean }>("/api/automation/settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runAutomationNow(count?: number) {
  return apiFetch<{ workspaceId: string; generated: number; published: number; skipped: boolean; reason?: string; error?: string }>(
    "/api/automation/run",
    {
      method: "POST",
      body: JSON.stringify({ count }),
    }
  );
}

export async function dashboardMetrics() {
  return apiFetch<DashboardMetricsResponse>("/api/dashboard/metrics", { method: "GET" });
}
