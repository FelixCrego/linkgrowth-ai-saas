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
    const account = await supabase
      .from("linkedin_accounts")
      .select("linkedin_member_urn,expires_at")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();

    if (account.error) throw account.error;

    sendJson(res, 200, {
      connected: Boolean(account.data),
      memberUrn: account.data?.linkedin_member_urn ?? null,
      expiresAt: account.data?.expires_at ?? null,
    });
  } catch (error) {
    serverError(res, error);
  }
}

