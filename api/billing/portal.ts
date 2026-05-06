import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appUrl } from "../_lib/env.js";
import { badRequest, methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getServiceSupabase } from "../_lib/supabase.js";
import { getStripe } from "../_lib/stripe.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const sessionUser = await requireSession(req, res);
    if (!sessionUser) return;

    const supabase = getServiceSupabase();
    const sub = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", sessionUser.workspaceId)
      .maybeSingle();

    if (sub.error) throw sub.error;
    if (!sub.data?.stripe_customer_id) return badRequest(res, "No Stripe customer found");

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.data.stripe_customer_id,
      return_url: `${appUrl()}/?billing=portal-return`,
    });

    sendJson(res, 200, { url: portal.url });
  } catch (error) {
    serverError(res, error);
  }
}

