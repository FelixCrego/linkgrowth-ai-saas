import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { generateImageBase64 } from "../_lib/openai.js";

const schema = z.object({
  prompt: z.string().min(5).max(1200),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid image prompt payload");

    const imageBase64 = await generateImageBase64(parsed.data.prompt);
    sendJson(res, 200, { imageBase64, mimeType: "image/png" });
  } catch (error) {
    serverError(res, error);
  }
}
