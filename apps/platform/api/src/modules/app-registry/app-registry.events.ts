export const appRegistryEvents = {
  tenantAccessChanged: "platform.app-registry.tenant-access-changed"
} as const;

export function createAppRegistryEvent(
  payload: { enabledAppIds: string[]; tenantId: number },
  correlationId: string
) {
  return {
    correlationId,
    name: appRegistryEvents.tenantAccessChanged,
    occurredAt: new Date().toISOString(),
    payload,
    tenantId: payload.tenantId,
    version: 1
  } as const;
}
