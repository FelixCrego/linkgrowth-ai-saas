import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateText } from "../_lib/openai.js";
import { getWorkspaceSubscription } from "../_lib/subscription.js";

const schema = z.object({ prompt: z.string().min(5) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid prompt payload");

    const subscription = await getWorkspaceSubscription(session.workspaceId);
    if (subscription.tier === "starter") {
      const usageRes = await sql<{ count: number }>(
        "select count(*)::int as count from generated_posts where workspace_id = $1 and created_at >= now() - interval '7 days'",
        [session.workspaceId]
      );
      const used = usageRes.rows[0]?.count ?? 0;
      const limit = 3;
      if (used >= limit) {
        return badRequest(res, "Starter plan limit reached (3 posts per 7 days). Upgrade to Pro for unlimited posts.");
      }
    }

    const content = await generateText(
      "You are a LinkedIn viral marketing expert. Write an engaging LinkedIn post with hook, whitespace, CTA, and 3 relevant hashtags.",
      parsed.data.prompt
    );

    await sql("insert into generated_posts (workspace_id, user_id, prompt, content) values ($1, $2, $3, $4)", [
      session.workspaceId,
      session.userId,
      parsed.data.prompt,
      content,
    ]);

    sendJson(res, 200, { content });
  } catch (error) {
    serverError(res, error);
  }
}
