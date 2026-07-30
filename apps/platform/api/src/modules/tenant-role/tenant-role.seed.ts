import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export async function seedTenantRoleModule(database: Kysely<TenantDatabase>) {
  for (const role of [
    {
      key: "admin",
      label: "Tenant Administrator",
      description: "Full tenant administration access.",
      protected: true
    },
    {
      key: "user",
      label: "User",
      description: "Standard tenant application user.",
      protected: false
    },
    {
      key: "auditor",
      label: "Auditor",
      description: "Read-only tenant audit access.",
      protected: false
    }
  ])
    await database
      .insertInto("roles")
      .values({
        description: role.description,
        is_protected: role.protected,
        key: role.key,
        label: role.label,
        status: "active",
        uuid: stable(`tenant-role:${role.key}`)
      })
      .onDuplicateKeyUpdate({
        description: role.description,
        is_protected: role.protected,
        label: role.label,
        status: "active"
      })
      .execute();
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
