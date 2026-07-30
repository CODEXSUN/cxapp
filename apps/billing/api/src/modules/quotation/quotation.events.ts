import type { DomainEvent } from "@codexsun/framework/events";
import type { QuotationStatus } from "./quotation.types.js";

export const quotationEvents = {
  changed: "billing.quotation.changed",
  confirmed: "billing.quotation.confirmed"
} as const;

export function createQuotationEvent(
  action: "created" | "updated" | "confirmed" | "cancelled" | "converted",
  payload: { id: string; status: QuotationStatus; salesInvoiceNo?: string },
  databaseName: string
): DomainEvent<typeof payload & { action: typeof action }> {
  return {
    eventName: action === "confirmed" ? quotationEvents.confirmed : quotationEvents.changed,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    payload: { action, ...payload },
    sourceModule: "billing.quotation",
    tenant: { tenantId: databaseName }
  };
}
