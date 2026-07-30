import { AsyncLocalStorage } from "node:async_hooks";

export type DevkitActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
  storageScope: string;
};

const actorContext = new AsyncLocalStorage<DevkitActor>();

export function runWithDevkitActor<T>(actor: DevkitActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireDevkitActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("DevKit requires a CXApp-provided actor.");
  return actor;
}
