import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

type SubscriptionRow = {
  tier: "starter" | "pro" | "elite";
  status: string;
  current_period_end: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const subRes = await sql<SubscriptionRow>(
      "select tier, status, current_period_end from subscriptions where workspace_id = $1",
      [sessionUser.workspaceId]
    );

    const sub = subRes.rows[0];

    sendJson(res, 200, {
      tier: sub?.tier ?? "starter",
      status: sub?.status ?? "inactive",
      currentPeriodEnd: sub?.current_period_end ?? null,
    });
  } catch (error) {
    serverError(res, error);
  }
}
