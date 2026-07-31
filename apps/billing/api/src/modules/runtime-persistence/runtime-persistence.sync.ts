export function billingRuntimePersistenceNeedsSync(input: { pending: number }) {
  return input.pending > 0;
}
