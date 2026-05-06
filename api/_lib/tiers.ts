export type Tier = "starter" | "pro" | "elite";

export function normalizeTier(value: string): Tier {
  const tier = value.toLowerCase();
  if (tier === "starter" || tier === "pro" || tier === "elite") return tier;
  throw new Error("Invalid tier");
}

export function tierPriceEnvName(tier: Tier): string {
  if (tier === "starter") return "STRIPE_PRICE_STARTER";
  if (tier === "pro") return "STRIPE_PRICE_PRO";
  return "STRIPE_PRICE_ELITE";
}
