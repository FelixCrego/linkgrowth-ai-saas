import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireEnv } from "../_lib/env.js";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

const schema = z.object({ query: z.string().min(2) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid research payload");

    const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "Return only valid JSON array with topic, sentiment, reach, relevance, explanation.",
    });

    const result = await model.generateContent(`Research LinkedIn growth trends for: ${parsed.data.query}`);
    const text = result.response.text();
    const match = text.match(/\[.*\]/s);
    if (!match) return badRequest(res, "Model output parsing failed");

    const trends = JSON.parse(match[0]);

    await sql(
      "insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)",
      [session.workspaceId, session.userId, parsed.data.query, JSON.stringify(trends)]
    );

    sendJson(res, 200, { trends });
  } catch (error) {
    serverError(res, error);
  }
}
