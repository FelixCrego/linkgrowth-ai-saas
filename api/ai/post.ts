import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { generateText } from "../_lib/openai.js";

const schema = z.object({ prompt: z.string().min(5) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid prompt payload");

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
