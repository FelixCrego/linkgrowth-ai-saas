import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireEnv } from "../_lib/env.js";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

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

    await sql(
      "insert into generated_posts (workspace_id, user_id, prompt, content) values ($1, $2, $3, $4)",
      [session.workspaceId, session.userId, parsed.data.prompt, content]
    );

    sendJson(res, 200, { content });
  } catch (error) {
    serverError(res, error);
  }
}
