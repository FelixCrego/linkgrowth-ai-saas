import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { publishLinkedInPost } from "../_lib/linkedin.js";
import { sql } from "../_lib/db.js";

const schema = z.object({ text: z.string().min(3).max(3000) });

type LinkedInRow = { access_token: string; linkedin_member_urn: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid publish payload");

    const accountRes = await sql<LinkedInRow>(
      "select access_token, linkedin_member_urn from linkedin_accounts where workspace_id = $1 limit 1",
      [session.workspaceId]
    );

    const account = accountRes.rows[0];
    if (!account) return badRequest(res, "LinkedIn is not connected");

    await publishLinkedInPost(account.access_token, account.linkedin_member_urn, parsed.data.text);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
