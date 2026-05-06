import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEnv } from "../_lib/env.js";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { getServiceSupabase } from "../_lib/supabase.js";
import { getStripe } from "../_lib/stripe.js";

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

    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const supabase = getServiceSupabase();

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId;
        if (workspaceId && typeof workspaceId === "string") {
          await supabase.from("subscriptions").upsert({
            workspace_id: workspaceId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
            status: "active",
          });
        }
      }

      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object;

        const lookup = await supabase
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        let workspaceId = lookup.data?.workspace_id ?? null;

        if (!workspaceId && typeof subscription.customer === "string") {
          const byCustomer = await supabase
            .from("subscriptions")
            .select("workspace_id")
            .eq("stripe_customer_id", subscription.customer)
            .maybeSingle();
          workspaceId = byCustomer.data?.workspace_id ?? null;
        }

        if (workspaceId) {
          const tier = priceIdToTier(subscription.items.data[0]?.price?.id);
          await supabase.from("subscriptions").upsert({
            workspace_id: workspaceId,
            stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
            status: subscription.status,
            tier,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    sendJson(res, 200, { received: true });
  } catch (error) {
    serverError(res, error);
  }
}

