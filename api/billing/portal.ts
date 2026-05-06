import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appUrl } from "../_lib/env.js";
import { badRequest, methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getStripe } from "../_lib/stripe.js";
import { sql } from "../_lib/db.js";

type SubscriptionRow = { stripe_customer_id: string | null };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const sub = await sql<SubscriptionRow>("select stripe_customer_id from subscriptions where workspace_id = $1", [
      sessionUser.workspaceId,
    ]);

    const customerId = sub.rows[0]?.stripe_customer_id;
    if (!customerId) return badRequest(res, "No Stripe customer found");

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/?billing=portal-return`,
    });

    sendJson(res, 200, { url: portal.url });
  } catch (error) {
    serverError(res, error);
  }
}
