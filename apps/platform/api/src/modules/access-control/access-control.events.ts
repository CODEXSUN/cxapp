export const accessControlEvents = { changed: "platform.access-control.changed" } as const;
export function createAccessControlEvent(kind: "permission" | "role" | "user", key: string) {
  return {
    name: accessControlEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { key, kind },
    version: 1
  };
}
