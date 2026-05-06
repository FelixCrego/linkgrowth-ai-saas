import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { getStripe } from "../_lib/stripe.js";

type SubscriptionRow = {
  tier: "starter" | "pro" | "elite";
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

function priceIdToTier(priceId: string | null | undefined): "starter" | "pro" | "elite" {
  if (!priceId) return "starter";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "elite";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "starter";
}

function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const topLevel = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  if (typeof topLevel === "number") return new Date(topLevel * 1000).toISOString();
  const itemLevel = subscription.items.data[0]?.current_period_end;
  if (typeof itemLevel === "number") return new Date(itemLevel * 1000).toISOString();
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const subRes = await sql<SubscriptionRow>(
      "select tier, status, current_period_end, stripe_customer_id from subscriptions where workspace_id = $1",
      [sessionUser.workspaceId]
    );
    let sub = subRes.rows[0];

    // Harden billing status: if DB isn't updated by webhook yet, attempt live sync from Stripe.
    if (sub?.stripe_customer_id) {
      try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
          customer: sub.stripe_customer_id,
          status: "all",
          limit: 5,
        });

          const preferred =
          subscriptions.data.find((item) => item.status === "active" || item.status === "trialing") ?? subscriptions.data[0] ?? null;

        if (preferred) {
          const priceId = preferred.items.data[0]?.price?.id ?? null;
          const tier = priceIdToTier(priceId);
          const currentPeriodEnd = subscriptionPeriodEndIso(preferred);

          await sql(
            `update subscriptions
             set stripe_subscription_id = $2,
                 stripe_price_id = $3,
                 status = $4,
                 tier = $5,
                 current_period_end = $6,
                 updated_at = now()
             where workspace_id = $1`,
            [sessionUser.workspaceId, preferred.id, priceId, preferred.status, tier, currentPeriodEnd]
          );

          sub = {
            ...sub,
            status: preferred.status,
            tier,
            current_period_end: currentPeriodEnd,
          };
        }
      } catch {
        // no-op: return persisted DB state if live Stripe sync fails
      }
    }

    sendJson(res, 200, {
      tier: sub?.tier ?? "starter",
      status: sub?.status ?? "inactive",
      currentPeriodEnd: sub?.current_period_end ?? null,
    });
  } catch (error) {
    serverError(res, error);
  }
}
