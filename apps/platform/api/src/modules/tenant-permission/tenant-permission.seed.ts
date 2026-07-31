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
  "role-permission.remove",
  "task-manager.access"
].map((key) => ({
  description:
    key === "task-manager.access" ? "Allows access to the tenant-owned Task Manager." : undefined,
  key:
    key === "task-manager.access" ? "platform.task-manager.access" : `platform.application.${key}`,
  label: key
    .split(".")
    .map((x) => x.replace("-", " "))
    .join(" · ")
}));
export async function seedTenantPermissionModule(database: Kysely<TenantDatabase>) {
  await database
    .updateTable("app_permissions")
    .set({ status: "inactive" })
    .where("key", "=", "devkit.access")
    .execute();

  for (const p of seeds)
    await database
      .insertInto("app_permissions")
      .values({
        description:
          p.description ?? `Allows ${p.label.toLowerCase()} in the tenant Application desk.`,
        is_protected: true,
        key: p.key,
        label: p.label,
        status: "active",
        uuid: stable(p.key)
      })
      .onDuplicateKeyUpdate({
        description:
          p.description ?? `Allows ${p.label.toLowerCase()} in the tenant Application desk.`,
        is_protected: true,
        label: p.label,
        status: "active"
      })
      .execute();
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
