import { createHash, randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type {
  AccessPermissionSavePayload,
  AccessRoleSavePayload,
  AccessUserSavePayload
} from "./access-control.types.js";

export class AccessControlRepository {
  async overview() {
    return {
      permissions: await this.permissions(),
      roles: await this.roles(),
      users: await this.users()
    };
  }
  async permissions() {
    return (
      await getPlatformDatabase()
        .selectFrom("access_permissions")
        .selectAll()
        .orderBy("key")
        .execute()
    ).map((r) => ({
      description: r.description,
      id: Number(r.id),
      key: r.key,
      label: r.label,
      status: r.status,
      uuid: r.uuid
    }));
  }
  async roles() {
    return (
      await getPlatformDatabase().selectFrom("access_roles").selectAll().orderBy("key").execute()
    ).map((r) => ({
      description: r.description,
      id: Number(r.id),
      key: r.key,
      label: r.label,
      permissionKeys: parseKeys(r.permission_keys_json),
      status: r.status,
      uuid: r.uuid
    }));
  }
  async users() {
    return (
      await getPlatformDatabase().selectFrom("access_users").selectAll().orderBy("name").execute()
    ).map((r) => ({
      email: r.email,
      id: Number(r.id),
      name: r.name,
      roleKey: r.role_key,
      status: r.status,
      uuid: r.uuid
    }));
  }
  async savePermission(input: AccessPermissionSavePayload) {
    await getPlatformDatabase()
      .insertInto("access_permissions")
      .values({
        description: input.description,
        key: input.key,
        label: input.label,
        status: input.status,
        uuid: stableUuid(`permission:${input.key}`)
      })
      .onDuplicateKeyUpdate({
        description: input.description,
        label: input.label,
        status: input.status
      })
      .execute();
    return (await this.permissions()).find((item) => item.key === input.key) ?? null;
  }
  async saveRole(input: AccessRoleSavePayload) {
    const keys = input.permissionKeysText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await getPlatformDatabase()
      .insertInto("access_roles")
      .values({
        description: input.description,
        key: input.key,
        label: input.label,
        permission_keys_json: JSON.stringify(keys),
        status: input.status,
        uuid: stableUuid(`role:${input.key}`)
      })
      .onDuplicateKeyUpdate({
        description: input.description,
        label: input.label,
        permission_keys_json: JSON.stringify(keys),
        status: input.status
      })
      .execute();
    return (await this.roles()).find((item) => item.key === input.key) ?? null;
  }
  async saveUser(input: AccessUserSavePayload) {
    await getPlatformDatabase()
      .insertInto("access_users")
      .values({
        email: input.email.trim().toLowerCase(),
        name: input.name,
        role_key: input.roleKey,
        status: input.status,
        uuid: randomBytes(4).toString("hex")
      })
      .onDuplicateKeyUpdate({ name: input.name, role_key: input.roleKey, status: input.status })
      .execute();
    return (
      (await this.users()).find((item) => item.email === input.email.trim().toLowerCase()) ?? null
    );
  }
}

function parseKeys(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
function stableUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
