import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { AccessControlRepository } from "./access-control.repository.js";

export async function seedAccessControlModule(_db: Kysely<PlatformDatabase>) {
  const repository = new AccessControlRepository();
  const permissions = [
    "platform.tenants.manage",
    "platform.plans.manage",
    "platform.access.manage",
    "platform.entitlements.manage"
  ];
  for (const key of permissions)
    await repository.savePermission({
      description: `${key} permission`,
      key,
      label: key,
      status: "active"
    });
  await repository.saveRole({
    description: "Full platform administration",
    key: "super-admin",
    label: "Super Admin",
    permissionKeysText: permissions.join(", "),
    status: "active"
  });
}
