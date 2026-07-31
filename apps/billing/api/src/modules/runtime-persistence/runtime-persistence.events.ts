export const runtimePersistenceEvents = {
  eventPublished: "billing.runtime-persistence.event-published",
  jobQueued: "billing.runtime-persistence.job-queued"
} as const;

export function createRuntimePersistenceEvent(action: keyof typeof runtimePersistenceEvents) {
  return {
    eventName: runtimePersistenceEvents[action],
    occurredAt: new Date().toISOString()
  };
}
