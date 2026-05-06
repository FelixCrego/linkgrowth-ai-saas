import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireEnv } from "../_lib/env";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";

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

    const supabase = getServiceSupabase();
    await supabase.from("research_queries").insert({
      workspace_id: session.workspaceId,
      user_id: session.userId,
      query: parsed.data.query,
      result_json: trends,
    });

    sendJson(res, 200, { trends });
  } catch (error) {
    serverError(res, error);
  }
}
