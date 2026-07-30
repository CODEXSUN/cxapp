export const subscriptionSync = { conflictPolicy: "server-wins", direction: "pull-only" } as const;
export function subscriptionNeedsSync(a: number, b: number) {
  return b > a;
}
