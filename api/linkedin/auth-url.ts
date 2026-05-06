import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { linkedinAuthUrl, linkedinCallbackUrlForRequest } from "../_lib/linkedin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const state = `${session.userId}:${session.workspaceId}:${Date.now()}`;
    const callbackUrl = linkedinCallbackUrlForRequest(req);
    sendJson(res, 200, { url: linkedinAuthUrl(state, callbackUrl) });
  } catch (error) {
    serverError(res, error);
  }
}

