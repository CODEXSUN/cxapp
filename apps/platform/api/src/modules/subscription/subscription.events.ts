export const subscriptionEvents = { changed: "platform.subscription.changed" } as const;
export function createSubscriptionEvent(subscriptionId: number, tenantId: number) {
  return {
    name: subscriptionEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { subscriptionId },
    tenantId,
    version: 1
  };
}
