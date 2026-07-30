export const planEvents = {
  created: "platform.plan.created",
  updated: "platform.plan.updated"
} as const;
export function createPlanEvent(
  name: (typeof planEvents)[keyof typeof planEvents],
  planId: number
) {
  return { name, occurredAt: new Date().toISOString(), payload: { planId }, version: 1 };
}
