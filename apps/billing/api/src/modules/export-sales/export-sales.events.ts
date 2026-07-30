export const exportSalesEvents = {
  cancelled: "billing.export-sales.cancelled",
  confirmed: "billing.export-sales.confirmed",
  created: "billing.export-sales.created",
  updated: "billing.export-sales.updated"
} as const;

export type ExportSalesEventName = (typeof exportSalesEvents)[keyof typeof exportSalesEvents];

export function createExportSalesEvent(
  name: ExportSalesEventName,
  payload: { exportSaleId: string; tenantId: string },
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
