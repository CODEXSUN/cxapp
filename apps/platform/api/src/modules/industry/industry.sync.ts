export const industrySync = { conflictPolicy: "server-wins", direction: "pull-only" } as const;
export function industryNeedsSync(a: number, b: number) {
  return b > a;
}
