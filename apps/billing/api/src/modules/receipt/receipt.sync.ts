import type { ReceiptStatus } from "./receipt.types.js";

export const receiptSyncPolicy = {
  conflict: "server-wins",
  direction: "bidirectional",
  scope: "tenant-database"
} as const;

export function decideReceiptSync(
  localUpdatedAt: string,
  remoteUpdatedAt: string,
  remoteStatus: ReceiptStatus
) {
  if (remoteStatus === "posted" || remoteStatus === "cancelled") return "accept-remote" as const;
  return Date.parse(localUpdatedAt) > Date.parse(remoteUpdatedAt)
    ? ("push-local" as const)
    : ("accept-remote" as const);
}
