import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { linkedinAuthUrl } from "../_lib/linkedin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const state = `${session.userId}:${session.workspaceId}:${Date.now()}`;
    sendJson(res, 200, { url: linkedinAuthUrl(state) });
  } catch (error) {
    serverError(res, error);
  }
}
