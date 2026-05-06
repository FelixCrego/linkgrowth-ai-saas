import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateWebResearchJson } from "../_lib/openai.js";
import { getWorkspaceSubscription, hasRequiredTier } from "../_lib/subscription.js";

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

    const subscription = await getWorkspaceSubscription(session.workspaceId);
    if (!hasRequiredTier(subscription.tier, "pro")) {
      return badRequest(res, "Deep Research is available on Pro and Elite plans.");
    }

    const researchResult = await generateWebResearchJson<{ trends?: Trend[] } | Trend[]>(
      "Return JSON only. Prefer an object with key 'trends' containing an array. Each trend must include topic, sentiment, reach, relevance (0-100), explanation.",
      `Use live web research to find current LinkedIn growth trends for: ${parsed.data.query}.
Prioritize specific, timely trends and avoid generic advice.`
    );

    const payload = researchResult.data;
    const trends = Array.isArray(payload) ? payload : payload?.trends;
    if (!Array.isArray(trends)) {
      return badRequest(res, "Model output parsing failed");
    }

    await sql("insert into research_queries (workspace_id, user_id, query, result_json) values ($1, $2, $3, $4::jsonb)", [
      session.workspaceId,
      session.userId,
      parsed.data.query,
      JSON.stringify({ trends, sources: researchResult.sources }),
    ]);

    sendJson(res, 200, { trends, sources: researchResult.sources });
  } catch (error) {
    serverError(res, error);
  }
}
