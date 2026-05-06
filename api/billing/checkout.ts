import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { appUrl, requireEnv } from "../_lib/env.js";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { getStripe } from "../_lib/stripe.js";
import { normalizeTier, tierPriceEnvName } from "../_lib/tiers.js";
import { sql } from "../_lib/db.js";

const schema = z.object({ tier: z.string() });

type WorkspaceRow = { id: string; name: string };
type UserRow = { email: string };
type SubscriptionRow = { stripe_customer_id: string | null };

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

    const workspaceRes = await sql<WorkspaceRow>("select id, name from workspaces where id = $1", [sessionUser.workspaceId]);
    const userRes = await sql<UserRow>("select email from users where id = $1", [sessionUser.userId]);
    const subRes = await sql<SubscriptionRow>(
      "select stripe_customer_id from subscriptions where workspace_id = $1",
      [sessionUser.workspaceId]
    );

    const workspace = workspaceRes.rows[0];
    const user = userRes.rows[0];
    if (!workspace || !user) return badRequest(res, "Workspace or user not found");

    let customerId = subRes.rows[0]?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name,
        metadata: { workspaceId: sessionUser.workspaceId },
      });
      customerId = customer.id;

      await sql(
        `insert into subscriptions (workspace_id, stripe_customer_id)
         values ($1, $2)
         on conflict (workspace_id)
         do update set stripe_customer_id = excluded.stripe_customer_id, updated_at = now()`,
        [sessionUser.workspaceId, customerId]
      );
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
