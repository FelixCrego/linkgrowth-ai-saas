import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireEnv } from "../_lib/env";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";

const schema = z.object({ trainingData: z.string().min(20) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid training payload");

    const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "Return only valid JSON object with tone, style, lengthPreference, emojiUsage, hookStrategy.",
    });

    const result = await model.generateContent(`Analyze this writing style: ${parsed.data.trainingData}`);
    const text = result.response.text();
    const match = text.match(/\{.*\}/s);
    if (!match) return badRequest(res, "Model output parsing failed");

    const profile = JSON.parse(match[0]);

    const supabase = getServiceSupabase();
    await supabase.from("voice_profiles").insert({
      workspace_id: session.workspaceId,
      user_id: session.userId,
      training_text: parsed.data.trainingData,
      profile_json: profile,
    });

    sendJson(res, 200, { profile });
  } catch (error) {
    serverError(res, error);
  }
}
