import { sql } from "./db.js";

export type WorkspaceTier = "starter" | "pro" | "elite";
export type SubscriptionStatus = "inactive" | "active" | "trialing" | "past_due" | "canceled" | string;

type SubscriptionRow = {
  tier: WorkspaceTier;
  status: SubscriptionStatus;
};

const tierRank: Record<WorkspaceTier, number> = {
  starter: 0,
  pro: 1,
  elite: 2,
};

export async function getWorkspaceSubscription(workspaceId: string): Promise<{ tier: WorkspaceTier; status: SubscriptionStatus }> {
  const result = await sql<SubscriptionRow>("select tier, status from subscriptions where workspace_id = $1 limit 1", [workspaceId]);
  const row = result.rows[0];
  return {
    tier: row?.tier ?? "starter",
    status: row?.status ?? "inactive",
  };
}

export function hasRequiredTier(currentTier: WorkspaceTier, requiredTier: WorkspaceTier): boolean {
  return tierRank[currentTier] >= tierRank[requiredTier];
}

