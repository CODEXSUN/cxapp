import type { PaymentStatus } from "./payment.types.js";

export const paymentSyncPolicy = {
  conflict: "server-wins",
  direction: "bidirectional",
  scope: "tenant-database"
} as const;

export function decidePaymentSync(
  localUpdatedAt: string,
  remoteUpdatedAt: string,
  remoteStatus: PaymentStatus
) {
  if (remoteStatus === "posted" || remoteStatus === "cancelled") return "accept-remote" as const;
  return Date.parse(localUpdatedAt) > Date.parse(remoteUpdatedAt)
    ? ("push-local" as const)
    : ("accept-remote" as const);
}
