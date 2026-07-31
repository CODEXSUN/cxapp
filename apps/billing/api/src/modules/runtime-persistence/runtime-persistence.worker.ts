export function processBillingOutboxJob(id: number) {
  return { id, processed: false, reason: "Owner worker is not registered." } as const;
}
