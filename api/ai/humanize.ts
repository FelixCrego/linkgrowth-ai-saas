import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { generateText } from "../_lib/openai.js";

const schema = z.object({
  content: z.string().min(20).max(5000),
  tone: z.string().min(2).max(80).optional(),
});

function normalizeLinkedInText(value: string): string {
  let text = value;
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid humanize payload");

    const tone = parsed.data.tone ?? "Natural";
    const humanized = await generateText(
      "You are an expert LinkedIn editor. Rewrite text to sound more human, authentic, and conversational while preserving meaning. Output plain text only, no markdown.",
      `Humanize this LinkedIn post.

Goals:
- Sound like a real person sharing lived experience.
- Keep it concise and readable with natural line breaks.
- Keep the same core message and CTA.
- Keep hashtags relevant and limited.
- Avoid sounding robotic, templated, or over-polished.
- No markdown syntax.

Preferred tone: ${tone}

Post:
${parsed.data.content}`
    );

    sendJson(res, 200, { content: normalizeLinkedInText(humanized) });
  } catch (error) {
    serverError(res, error);
  }
}
