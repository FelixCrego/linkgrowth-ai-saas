import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

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

    await sql(
      `insert into onboarding_profiles (workspace_id, user_id, niche, industry, target_audience, tone, frequency, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (workspace_id)
       do update set
        user_id = excluded.user_id,
        niche = excluded.niche,
        industry = excluded.industry,
        target_audience = excluded.target_audience,
        tone = excluded.tone,
        frequency = excluded.frequency,
        updated_at = now()`,
      [
        session.workspaceId,
        session.userId,
        parsed.data.niche,
        parsed.data.industry,
        parsed.data.targetAudience,
        parsed.data.tone,
        parsed.data.frequency,
      ]
    );

    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
