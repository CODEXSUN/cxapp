export const tenantEvents = {
  created: "tenant.created",
  restored: "tenant.restored",
  suspended: "tenant.suspended",
  updated: "tenant.updated"
} as const;

export type TenantEventName = (typeof tenantEvents)[keyof typeof tenantEvents];

export function createTenantEvent(
  name: TenantEventName,
  tenant: { id: number; tenantCode: string; uuid: string },
  correlationId: string
) {
  return {
    correlationId,
    name,
    occurredAt: new Date().toISOString(),
    payload: { tenantCode: tenant.tenantCode, tenantUuid: tenant.uuid },
    tenantId: tenant.id,
    version: 1
  } as const;
}
