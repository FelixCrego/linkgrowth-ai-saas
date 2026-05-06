import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireEnv } from "../_lib/env";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";

const schema = z.object({ prompt: z.string().min(5) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid prompt payload");

    const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "Write an engaging LinkedIn post with hook, whitespace, CTA, and 3 hashtags.",
    });

    const result = await model.generateContent(parsed.data.prompt);
    const content = result.response.text();

    const supabase = getServiceSupabase();
    await supabase.from("generated_posts").insert({
      workspace_id: session.workspaceId,
      user_id: session.userId,
      prompt: parsed.data.prompt,
      content,
    });

    sendJson(res, 200, { content });
  } catch (error) {
    serverError(res, error);
  }
}
