import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    await sql("delete from linkedin_accounts where workspace_id = $1", [session.workspaceId]);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
