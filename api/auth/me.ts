import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

type UserRow = { id: string; email: string; full_name: string };
type WorkspaceRow = { id: string; name: string; slug: string };
type SubscriptionRow = { tier: "starter" | "pro" | "elite"; status: string };
type OnboardingRow = {
  niche: string;
  industry: string;
  target_audience: string;
  tone: string;
  frequency: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const userRes = await sql<UserRow>("select id, email, full_name from users where id = $1", [session.userId]);
    const workspaceRes = await sql<WorkspaceRow>("select id, name, slug from workspaces where id = $1", [session.workspaceId]);
    const subRes = await sql<SubscriptionRow>("select tier, status from subscriptions where workspace_id = $1", [session.workspaceId]);
    const onboardingRes = await sql<OnboardingRow>(
      "select niche, industry, target_audience, tone, frequency from onboarding_profiles where workspace_id = $1",
      [session.workspaceId]
    );

    const user = userRes.rows[0];
    const workspace = workspaceRes.rows[0];
    if (!user || !workspace) {
      return sendJson(res, 404, { error: "Session data not found" });
    }

    const sub = subRes.rows[0];
    const onboarding = onboardingRes.rows[0];

    sendJson(res, 200, {
      user,
      workspace,
      tier: sub?.tier ?? "starter",
      subscriptionStatus: sub?.status ?? "inactive",
      onboarding: onboarding
        ? {
            niche: onboarding.niche,
            industry: onboarding.industry,
            targetAudience: onboarding.target_audience,
            tone: onboarding.tone,
            frequency: onboarding.frequency,
          }
        : null,
      isOnboarded: Boolean(onboarding),
    });
  } catch (error) {
    serverError(res, error);
  }
}
