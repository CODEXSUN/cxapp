import type { DomainEvent } from "@codexsun/framework/events";
import type { PaymentStatus } from "./payment.types.js";

export const paymentEvents = {
  changed: "billing.payment.changed",
  posted: "billing.payment.posted"
} as const;

export function createPaymentEvent(
  action: "created" | "updated" | "posted" | "cancelled",
  payload: { id: string; status: PaymentStatus },
  databaseName: string
): DomainEvent<typeof payload & { action: typeof action }> {
  return {
    eventName: action === "posted" ? paymentEvents.posted : paymentEvents.changed,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    payload: { action, ...payload },
    sourceModule: "billing.payment",
    tenant: { tenantId: databaseName }
  };
}
