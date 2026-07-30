export const queueManagerEvents = { changed: "platform.queue-manager.changed" } as const;
export function createQueueManagerEvent(jobName: string, status: string) {
  return {
    name: queueManagerEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { jobName, status },
    version: 1
  };
}
