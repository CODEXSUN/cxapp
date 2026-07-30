import type { ReceiptEvent } from "./receipt.types.js";

export const receiptEvents = {
  cancelled: "billing.receipt.cancelled",
  created: "billing.receipt.created",
  posted: "billing.receipt.posted"
} as const;

export function createReceiptEvent(input: Omit<ReceiptEvent, "occurredAt">): ReceiptEvent {
  return { ...input, occurredAt: new Date().toISOString() };
}

export function receiptEventDescription(event: ReceiptEvent) {
  const action = event.type.split(".").at(-1) ?? "updated";
  return `Receipt ${event.receiptId} ${action}.`;
}
