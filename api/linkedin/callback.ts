import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeLinkedInCode, fetchLinkedInMemberUrn, resolveAppUrlFromRequest, linkedinCallbackUrlForRequest } from "../_lib/linkedin.js";
import { serverError } from "../_lib/http.js";
import { sql } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = req.query.code;
    const state = req.query.state;

    if (typeof code !== "string" || typeof state !== "string") {
      return res.status(400).send("Missing code or state");
    }

    const [userId, workspaceId] = state.split(":");
    if (!userId || !workspaceId) {
      return res.status(400).send("Invalid OAuth state");
    }

    const callbackUrl = linkedinCallbackUrlForRequest(req);
    const token = await exchangeLinkedInCode(code, callbackUrl);
    const memberUrn = await fetchLinkedInMemberUrn(token.access_token);

    await sql(
      `insert into linkedin_accounts (workspace_id, user_id, linkedin_member_urn, access_token, expires_at, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (workspace_id)
       do update set
        user_id = excluded.user_id,
        linkedin_member_urn = excluded.linkedin_member_urn,
        access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        updated_at = now()`,
      [workspaceId, userId, memberUrn, token.access_token, new Date(Date.now() + token.expires_in * 1000).toISOString()]
    );

    const redirectBase = resolveAppUrlFromRequest(req).replace(/\/$/, "");
    res.status(302).setHeader("Location", `${redirectBase}/?linkedin=connected`).end();
  } catch (error) {
    serverError(res, error);
  }
}
