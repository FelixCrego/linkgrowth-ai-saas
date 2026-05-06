import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateJson } from "../_lib/openai.js";

const schema = z.object({ query: z.string().min(2) });

type Trend = {
  topic: string;
  sentiment: string;
  reach: string;
  relevance: number;
  explanation: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid research payload");

    const trends = await generateJson<Trend[]>(
      "Return ONLY a JSON array. Each object must include topic, sentiment, reach, relevance (0-100 number), explanation.",
      `Research LinkedIn growth trends for: ${parsed.data.query}`
    );

    if (!Array.isArray(trends)) {
      return badRequest(res, "Model output parsing failed");
    }

    await sql("insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)", [
      session.workspaceId,
      session.userId,
      parsed.data.query,
      JSON.stringify(trends),
    ]);

    sendJson(res, 200, { trends });
  } catch (error) {
    serverError(res, error);
  }
}
