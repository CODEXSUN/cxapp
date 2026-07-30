import type { Purchase } from "./purchase.types.js";

export function shouldSyncPurchase(purchase: Pick<Purchase, "amount" | "status">) {
  return purchase.status === "confirmed" && purchase.amount > 0;
}

export function buildPurchaseSyncSummary(purchases: Array<Pick<Purchase, "amount" | "status">>) {
  const ready = purchases.filter(shouldSyncPurchase).length;
  return { ready, skipped: purchases.length - ready, total: purchases.length };
}
