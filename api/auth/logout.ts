import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookie } from "../_lib/session.js";
import { methodNotAllowed, sendJson } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

