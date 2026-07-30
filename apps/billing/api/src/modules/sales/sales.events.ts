export const salesEvents = {
  cancelled: "billing.sales.cancelled",
  confirmed: "billing.sales.confirmed",
  created: "billing.sales.created",
  updated: "billing.sales.updated"
} as const;

export type SalesEventName = (typeof salesEvents)[keyof typeof salesEvents];

export function createSalesEvent(
  name: SalesEventName,
  payload: { saleId: string; tenantId: string },
  correlationId: string
) {
  return {
    correlationId,
    name,
    occurredAt: new Date().toISOString(),
    payload,
    tenantId: payload.tenantId,
    version: 1
  } as const;
}
