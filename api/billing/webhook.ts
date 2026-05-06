import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { requireEnv } from "../_lib/env.js";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { getStripe } from "../_lib/stripe.js";
import { sql } from "../_lib/db.js";

function priceIdToTier(priceId: string | null | undefined): "starter" | "pro" | "elite" {
  if (!priceId) return "starter";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "elite";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "starter";
}

export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const stripe = getStripe();
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) return res.status(400).send("Missing Stripe signature");

    const event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      if (workspaceId && typeof workspaceId === "string") {
        await sql(
          `insert into subscriptions (workspace_id, stripe_customer_id, stripe_subscription_id, status, updated_at)
           values ($1, $2, $3, 'active', now())
           on conflict (workspace_id)
           do update set
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            status = excluded.status,
            updated_at = now()`,
          [
            workspaceId,
            typeof session.customer === "string" ? session.customer : null,
            typeof session.subscription === "string" ? session.subscription : null,
          ]
        );
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      const lookupBySub = await sql<{ workspace_id: string }>(
        "select workspace_id from subscriptions where stripe_subscription_id = $1 limit 1",
        [subscription.id]
      );

      let workspaceId = lookupBySub.rows[0]?.workspace_id ?? null;

      if (!workspaceId && typeof subscription.customer === "string") {
        const lookupByCustomer = await sql<{ workspace_id: string }>(
          "select workspace_id from subscriptions where stripe_customer_id = $1 limit 1",
          [subscription.customer]
        );
        workspaceId = lookupByCustomer.rows[0]?.workspace_id ?? null;
      }

      if (workspaceId) {
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const tier = priceIdToTier(priceId);
        const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
        const currentPeriodEnd = typeof currentPeriodEndRaw === "number" ? new Date(currentPeriodEndRaw * 1000).toISOString() : null;

        await sql(
          `insert into subscriptions (
            workspace_id,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            status,
            tier,
            current_period_end,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, now())
          on conflict (workspace_id)
          do update set
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            stripe_price_id = excluded.stripe_price_id,
            status = excluded.status,
            tier = excluded.tier,
            current_period_end = excluded.current_period_end,
            updated_at = now()`,
          [
            workspaceId,
            typeof subscription.customer === "string" ? subscription.customer : null,
            subscription.id,
            priceId,
            subscription.status,
            tier,
            currentPeriodEnd,
          ]
        );
      }
    }

    sendJson(res, 200, { received: true });
  } catch (error) {
    serverError(res, error);
  }
}
