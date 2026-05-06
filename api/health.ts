import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson } from "./_lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  sendJson(res, 200, { status: "ok", service: "linkgrowth-api", now: new Date().toISOString() });
}

