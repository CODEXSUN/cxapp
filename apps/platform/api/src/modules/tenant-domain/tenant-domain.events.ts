export const tenantDomainEvents = {
  created: "tenant-domain.created",
  primaryUpdated: "tenant-domain.primary-updated"
} as const;

export type TenantDomainEventName = (typeof tenantDomainEvents)[keyof typeof tenantDomainEvents];

export function createTenantDomainEvent(
  name: TenantDomainEventName,
  payload: { domain: string; tenantId: number; uuid: string },
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
