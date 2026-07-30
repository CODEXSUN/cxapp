export const platformActivityEvents = { recorded: "platform.activity.recorded" } as const;
export function createPlatformActivityEvent(activityId: number) {
  return {
    name: platformActivityEvents.recorded,
    occurredAt: new Date().toISOString(),
    payload: { activityId },
    version: 1
  };
}
