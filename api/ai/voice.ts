import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateJson } from "../_lib/openai.js";

const schema = z.object({ trainingData: z.string().min(20) });

type VoiceProfile = {
  tone: string;
  style: string;
  lengthPreference: string;
  emojiUsage: string;
  hookStrategy: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid training payload");

    const profile = await generateJson<VoiceProfile>(
      "Return ONLY a JSON object with keys: tone, style, lengthPreference, emojiUsage, hookStrategy.",
      `Analyze this writing style: ${parsed.data.trainingData}`
    );

    if (!profile || typeof profile !== "object") {
      return badRequest(res, "Model output parsing failed");
    }

    await sql(
      "insert into voice_profiles (workspace_id, user_id, training_text, profile_json) values ($1, $2, $3, $4::jsonb)",
      [session.workspaceId, session.userId, parsed.data.trainingData, JSON.stringify(profile)]
    );

    sendJson(res, 200, { profile });
  } catch (error) {
    serverError(res, error);
  }
}
