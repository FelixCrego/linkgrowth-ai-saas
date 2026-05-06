import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getServiceSupabase } from "../_lib/supabase.js";

const schema = z.object({
  niche: z.string().min(1),
  industry: z.string().min(1),
  targetAudience: z.string().min(1),
  tone: z.string().min(1),
  frequency: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid onboarding payload");

    const supabase = getServiceSupabase();
    const upsert = await supabase.from("onboarding_profiles").upsert({
      workspace_id: session.workspaceId,
      user_id: session.userId,
      niche: parsed.data.niche,
      industry: parsed.data.industry,
      target_audience: parsed.data.targetAudience,
      tone: parsed.data.tone,
      frequency: parsed.data.frequency,
      updated_at: new Date().toISOString(),
    });

    if (upsert.error) throw upsert.error;
    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}

