import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { optionalEnv } from "../_lib/env.js";
import { runAllEnabledAutomations } from "../_lib/automation.js";

function isAuthorized(req: VercelRequest): boolean {
  const fromVercelCron = Boolean(req.headers["x-vercel-cron"]);
  if (fromVercelCron) return true;

  const secret = optionalEnv("AUTOMATION_CRON_SECRET");
  if (!secret) return false;
  const authHeader = req.headers.authorization ?? "";
  return authHeader === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  try {
    if (!isAuthorized(req)) {
      return sendJson(res, 401, { error: "Unauthorized cron request" });
    }

    const results = await runAllEnabledAutomations();
    const summary = {
      workspaces: results.length,
      generated: results.reduce((sum, item) => sum + item.generated, 0),
      published: results.reduce((sum, item) => sum + item.published, 0),
      failed: results.filter((item) => Boolean(item.error)).length,
      skipped: results.filter((item) => item.skipped).length,
    };

    sendJson(res, 200, { ok: true, summary, results });
  } catch (error) {
    serverError(res, error);
  }
}
