import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export async function seedSubscriptionModule(_db: Kysely<PlatformDatabase>) {
  return { seeded: 0, policy: "subscriptions-require-explicit-tenant-assignment" } as const;
}
