import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getServiceSupabase } from "../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const supabase = getServiceSupabase();

    const userRes = await supabase.from("users").select("id,email,full_name").eq("id", session.userId).single();
    if (userRes.error) throw userRes.error;

    const workspaceRes = await supabase.from("workspaces").select("id,name,slug").eq("id", session.workspaceId).single();
    if (workspaceRes.error) throw workspaceRes.error;

    const subRes = await supabase.from("subscriptions").select("tier,status").eq("workspace_id", session.workspaceId).maybeSingle();
    if (subRes.error) throw subRes.error;

    const onboardingRes = await supabase
      .from("onboarding_profiles")
      .select("niche,industry,target_audience,tone,frequency")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    if (onboardingRes.error) throw onboardingRes.error;

    sendJson(res, 200, {
      user: userRes.data,
      workspace: workspaceRes.data,
      tier: subRes.data?.tier ?? "starter",
      subscriptionStatus: subRes.data?.status ?? "inactive",
      onboarding: onboardingRes.data
        ? {
            niche: onboardingRes.data.niche,
            industry: onboardingRes.data.industry,
            targetAudience: onboardingRes.data.target_audience,
            tone: onboardingRes.data.tone,
            frequency: onboardingRes.data.frequency,
          }
        : null,
      isOnboarded: Boolean(onboardingRes.data),
    });
  } catch (error) {
    serverError(res, error);
  }
}

