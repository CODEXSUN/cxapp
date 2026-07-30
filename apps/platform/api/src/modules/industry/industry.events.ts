export const industryEvents = { changed: "platform.industry.changed" } as const;
export function createIndustryEvent(industryId: number) {
  return {
    name: industryEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { industryId },
    version: 1
  };
}
