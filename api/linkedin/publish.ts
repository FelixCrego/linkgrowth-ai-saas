import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";
import { publishLinkedInPost } from "../_lib/linkedin";

const schema = z.object({ text: z.string().min(3).max(3000) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid publish payload");

    const supabase = getServiceSupabase();
    const accountRes = await supabase
      .from("linkedin_accounts")
      .select("access_token,linkedin_member_urn")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();

    if (accountRes.error) throw accountRes.error;
    if (!accountRes.data) return badRequest(res, "LinkedIn is not connected");

    await publishLinkedInPost(accountRes.data.access_token, accountRes.data.linkedin_member_urn, parsed.data.text);

    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
