import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appUrl } from "../_lib/env";
import { exchangeLinkedInCode, fetchLinkedInMemberUrn } from "../_lib/linkedin";
import { serverError } from "../_lib/http";
import { getServiceSupabase } from "../_lib/supabase";

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

    const token = await exchangeLinkedInCode(code);
    const memberUrn = await fetchLinkedInMemberUrn(token.access_token);

    const supabase = getServiceSupabase();
    const upsert = await supabase.from("linkedin_accounts").upsert({
      workspace_id: workspaceId,
      user_id: userId,
      linkedin_member_urn: memberUrn,
      access_token: token.access_token,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (upsert.error) throw upsert.error;

    res.status(302).setHeader("Location", `${appUrl()}/?linkedin=connected`).end();
  } catch (error) {
    serverError(res, error);
  }
}
