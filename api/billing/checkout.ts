import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { appUrl, requireEnv } from "../_lib/env";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { requireSession } from "../_lib/session";
import { getServiceSupabase } from "../_lib/supabase";
import { getStripe } from "../_lib/stripe";
import { normalizeTier, tierPriceEnvName } from "../_lib/tiers";

const schema = z.object({ tier: z.string() });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid checkout payload");

    const tier = normalizeTier(parsed.data.tier);
    if (tier === "starter") return badRequest(res, "Starter does not require checkout");

    const priceId = requireEnv(tierPriceEnvName(tier));
    const stripe = getStripe();
    const supabase = getServiceSupabase();

    const workspaceRes = await supabase.from("workspaces").select("id,name").eq("id", sessionUser.workspaceId).single();
    if (workspaceRes.error) throw workspaceRes.error;

    const userRes = await supabase.from("users").select("email").eq("id", sessionUser.userId).single();
    if (userRes.error) throw userRes.error;

    const subRes = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", sessionUser.workspaceId)
      .maybeSingle();
    if (subRes.error) throw subRes.error;

    let customerId = subRes.data?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRes.data.email,
        name: workspaceRes.data.name,
        metadata: { workspaceId: sessionUser.workspaceId },
      });
      customerId = customer.id;

      const upsert = await supabase.from("subscriptions").upsert({
        workspace_id: sessionUser.workspaceId,
        stripe_customer_id: customerId,
      });
      if (upsert.error) throw upsert.error;
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/?billing=success`,
      cancel_url: `${appUrl()}/?billing=cancel`,
      metadata: {
        workspaceId: sessionUser.workspaceId,
        userId: sessionUser.userId,
        tier,
      },
      allow_promotion_codes: true,
    });

    sendJson(res, 200, { url: checkout.url });
  } catch (error) {
    serverError(res, error);
  }
}
