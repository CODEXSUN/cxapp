export function appOrchestrationNeedsSync(input: { expected: number; observed: number }) {
  return input.expected !== input.observed;
}
