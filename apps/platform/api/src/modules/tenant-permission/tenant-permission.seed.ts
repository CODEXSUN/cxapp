import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
const seeds = [
  "user.view",
  "user.create",
  "user.update",
  "user.suspend",
  "user.delete",
  "role.view",
  "role.create",
  "role.update",
  "role.suspend",
  "role.delete",
  "permission.view",
  "permission.create",
  "permission.update",
  "permission.suspend",
  "permission.delete",
  "user-role.view",
  "user-role.assign",
  "user-role.update",
  "user-role.remove",
  "role-permission.view",
  "role-permission.assign",
  "role-permission.update",
  "role-permission.remove"
].map((key) => ({
  key: `platform.application.${key}`,
  label: key
    .split(".")
    .map((x) => x.replace("-", " "))
    .join(" · ")
}));
export async function seedTenantPermissionModule(database: Kysely<TenantDatabase>) {
  for (const p of seeds)
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${p.label.toLowerCase()} in the tenant Application desk.`,
        is_protected: true,
        key: p.key,
        label: p.label,
        status: "active",
        uuid: stable(p.key)
      })
      .onDuplicateKeyUpdate({
        description: `Allows ${p.label.toLowerCase()} in the tenant Application desk.`,
        is_protected: true,
        label: p.label,
        status: "active"
      })
      .execute();
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
