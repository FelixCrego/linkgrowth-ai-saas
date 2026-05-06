import Stripe from "stripe";
import { requireEnv } from "./env.js";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return stripeClient;
}

