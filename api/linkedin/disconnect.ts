import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const supabase = getServiceSupabase();
    const del = await supabase.from("linkedin_accounts").delete().eq("workspace_id", session.workspaceId);
    if (del.error) throw del.error;

    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
