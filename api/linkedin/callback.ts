import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeLinkedInCode, fetchLinkedInMemberUrn, resolveAppUrlFromRequest, linkedinCallbackUrlForRequest } from "../_lib/linkedin.js";
import { sql } from "../_lib/db.js";

function popupResponseHtml(origin: string, payload: { type: string; success: boolean; message?: string }): string {
  const serialized = JSON.stringify(payload);
  const safeOrigin = JSON.stringify(origin);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>LinkedIn Connection</title>
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
    <p>${payload.success ? "LinkedIn connected. You can close this window." : "LinkedIn connection failed. You can close this window."}</p>
    <script>
      (function() {
        var data = ${serialized};
        var targetOrigin = ${safeOrigin};
        if (window.opener && typeof window.opener.postMessage === "function") {
          window.opener.postMessage(data, targetOrigin);
          window.close();
          return;
        }
        window.location.href = targetOrigin + "/?linkedin=" + (data.success ? "connected" : "failed");
      })();
    </script>
  </body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redirectBase = resolveAppUrlFromRequest(req).replace(/\/$/, "");

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

    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
      popupResponseHtml(redirectBase, { type: "LINKEDIN_CONNECTED", success: true })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn callback failed";
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
      popupResponseHtml(redirectBase, { type: "LINKEDIN_CONNECT_FAILED", success: false, message })
    );
  }
}
