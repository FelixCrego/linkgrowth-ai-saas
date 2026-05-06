import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

type LinkedInRow = { linkedin_member_urn: string; expires_at: string | null };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const account = await sql<LinkedInRow>(
      "select linkedin_member_urn, expires_at from linkedin_accounts where workspace_id = $1 limit 1",
      [session.workspaceId]
    );

    const row = account.rows[0];
    sendJson(res, 200, {
      connected: Boolean(row),
      memberUrn: row?.linkedin_member_urn ?? null,
      expiresAt: row?.expires_at ?? null,
    });
  } catch (error) {
    serverError(res, error);
  }
}
