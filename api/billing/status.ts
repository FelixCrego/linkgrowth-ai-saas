import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getServiceSupabase } from "../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const supabase = getServiceSupabase();
    const sub = await supabase
      .from("subscriptions")
      .select("tier,status,current_period_end")
      .eq("workspace_id", sessionUser.workspaceId)
      .maybeSingle();

    if (sub.error) throw sub.error;

    sendJson(res, 200, {
      tier: sub.data?.tier ?? "starter",
      status: sub.data?.status ?? "inactive",
      currentPeriodEnd: sub.data?.current_period_end ?? null,
    });
  } catch (error) {
    serverError(res, error);
  }
}

