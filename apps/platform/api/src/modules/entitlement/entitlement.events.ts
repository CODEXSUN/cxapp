export const entitlementEvents = {
  changed: "platform.entitlement.changed",
  seeded: "platform.entitlement.seeded"
} as const;

export function createEntitlementEvent(entitlementId: number) {
  return {
    name: entitlementEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { entitlementId },
    version: 1
  };
}
