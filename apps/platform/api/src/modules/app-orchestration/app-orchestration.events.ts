export function createAppOrchestrationEvent(appId: string, action: string) {
  return { action, appId, occurredAt: new Date().toISOString() };
}
