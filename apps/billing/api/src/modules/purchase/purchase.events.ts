import type { DomainEvent } from "@codexsun/framework/events";
import type { PurchaseStatus } from "./purchase.types.js";

export const purchaseEvents = {
  changed: "billing.purchase.changed",
  confirmed: "billing.purchase.confirmed"
} as const;

export function createPurchaseEvent(
  action: "created" | "updated" | "confirmed" | "cancelled" | "converted",
  payload: { id: string; status: PurchaseStatus; salesInvoiceNo?: string },
  databaseName: string
): DomainEvent<typeof payload & { action: typeof action }> {
  return {
    eventName: action === "confirmed" ? purchaseEvents.confirmed : purchaseEvents.changed,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    payload: { action, ...payload },
    sourceModule: "billing.purchase",
    tenant: { tenantId: databaseName }
  };
}
