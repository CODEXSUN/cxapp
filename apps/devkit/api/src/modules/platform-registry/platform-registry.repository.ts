import { randomBytes } from "node:crypto";
import type { Kysely, Selectable } from "kysely";
import { getDevkitDatabase } from "../../database/devkit-database.js";
import type {
  DevkitDatabase,
  PlatformRegistryGroupsTable,
  PlatformRegistryModulesTable,
  PlatformRegistryPlatformsTable
} from "../../database/schema.js";
import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform
} from "./platform-registry.types.js";

type AuditInput = {
  action: string;
  actorEmail: string;
  details?: unknown;
  recordKind: string;
  recordUuid: string;
};

export class PlatformRegistryRepository {
  constructor(private readonly database: Kysely<DevkitDatabase> = getDevkitDatabase()) {}

  async listRegistryPlatforms() {
    const rows = await this.database
      .selectFrom("devkit_platform_registry_platforms")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapPlatform);
  }

  async findRegistryPlatform(uuid: string) {
    const row = await this.database
      .selectFrom("devkit_platform_registry_platforms")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapPlatform(row) : null;
  }

  async registryPlatformKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("devkit_platform_registry_platforms")
      .select("id")
      .where("platform_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryPlatform(record: PlatformRegistryPlatform, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("devkit_platform_registry_platforms")
        .values(platformValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-platform-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-platform",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryPlatform(record: PlatformRegistryPlatform, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("devkit_platform_registry_platforms")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          name: record.name,
          platform_key: record.key,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-platform-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-platform",
        recordUuid: record.id
      });
    });
    return record;
  }

  async listRegistryGroups() {
    const rows = await this.database
      .selectFrom("devkit_platform_registry_groups")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapGroup);
  }

  async findRegistryGroup(uuid: string) {
    const row = await this.database
      .selectFrom("devkit_platform_registry_groups")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapGroup(row) : null;
  }

  async registryGroupKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("devkit_platform_registry_groups")
      .select("id")
      .where("group_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryGroup(record: PlatformRegistryGroup, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("devkit_platform_registry_groups")
        .values(groupValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-group-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-group",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryGroup(record: PlatformRegistryGroup, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("devkit_platform_registry_groups")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          group_key: record.key,
          name: record.name,
          parent_group_uuid: record.parentGroupId || null,
          platform_uuid: record.platformId,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-group-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-group",
        recordUuid: record.id
      });
    });
    return record;
  }

  async listRegistryModules() {
    const rows = await this.database
      .selectFrom("devkit_platform_registry_modules")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(mapModule);
  }

  async findRegistryModule(uuid: string) {
    const row = await this.database
      .selectFrom("devkit_platform_registry_modules")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? mapModule(row) : null;
  }

  async registryModuleKeyExists(key: string, exceptUuid?: string) {
    let query = this.database
      .selectFrom("devkit_platform_registry_modules")
      .select("id")
      .where("module_key", "=", key);
    if (exceptUuid) query = query.where("uuid", "!=", exceptUuid);
    return Boolean(await query.executeTakeFirst());
  }

  async createRegistryModule(record: PlatformRegistryModule, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .insertInto("devkit_platform_registry_modules")
        .values(moduleValues(record))
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-module-created",
        actorEmail,
        details: { key: record.key, name: record.name },
        recordKind: "registry-module",
        recordUuid: record.id
      });
    });
    return record;
  }

  async updateRegistryModule(record: PlatformRegistryModule, actorEmail: string) {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("devkit_platform_registry_modules")
        .set({
          active: record.active ? 1 : 0,
          description: record.description,
          documentation_json: JSON.stringify(record.documentation),
          group_uuid: record.groupId,
          module_key: record.key,
          module_type: record.moduleType,
          name: record.name,
          parent_module_uuid: record.parentModuleId || null,
          planning_notes_json: JSON.stringify(record.planningNotes),
          route_path: record.routePath,
          sort_order: record.sortOrder,
          status: record.status,
          updated_at: new Date(record.updatedAt)
        })
        .where("uuid", "=", record.id)
        .executeTakeFirstOrThrow();
      await writeActivity(transaction, {
        action: "registry-module-updated",
        actorEmail,
        details: { active: record.active, key: record.key },
        recordKind: "registry-module",
        recordUuid: record.id
      });
    });
    return record;
  }
}

function platformValues(record: PlatformRegistryPlatform) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    name: record.name,
    platform_key: record.key,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

function groupValues(record: PlatformRegistryGroup) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    group_key: record.key,
    name: record.name,
    parent_group_uuid: record.parentGroupId || null,
    platform_uuid: record.platformId,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

function moduleValues(record: PlatformRegistryModule) {
  return {
    active: record.active ? 1 : 0,
    created_at: new Date(record.createdAt),
    description: record.description,
    documentation_json: JSON.stringify(record.documentation),
    group_uuid: record.groupId,
    module_key: record.key,
    module_type: record.moduleType,
    name: record.name,
    parent_module_uuid: record.parentModuleId || null,
    planning_notes_json: JSON.stringify(record.planningNotes),
    route_path: record.routePath,
    sort_order: record.sortOrder,
    status: record.status,
    updated_at: new Date(record.updatedAt),
    uuid: record.id
  };
}

async function writeActivity(database: Kysely<DevkitDatabase>, input: AuditInput) {
  await database
    .insertInto("devkit_platform_registry_activity")
    .values({
      action: input.action,
      actor_email: input.actorEmail,
      details_json: JSON.stringify(input.details ?? {}),
      record_kind: input.recordKind,
      record_uuid: input.recordUuid,
      uuid: newUuid()
    })
    .executeTakeFirstOrThrow();
}

function mapPlatform(row: Selectable<PlatformRegistryPlatformsTable>): PlatformRegistryPlatform {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    id: row.uuid,
    key: row.platform_key,
    name: row.name,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function mapGroup(row: Selectable<PlatformRegistryGroupsTable>): PlatformRegistryGroup {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    id: row.uuid,
    key: row.group_key,
    name: row.name,
    parentGroupId: row.parent_group_uuid ?? "",
    platformId: row.platform_uuid,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function mapModule(row: Selectable<PlatformRegistryModulesTable>): PlatformRegistryModule {
  return {
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
    description: row.description,
    documentation: parseJson(row.documentation_json, {}),
    groupId: row.group_uuid,
    id: row.uuid,
    key: row.module_key,
    moduleType: row.module_type as PlatformRegistryModule["moduleType"],
    name: row.name,
    parentModuleId: row.parent_module_uuid ?? "",
    planningNotes: parseJson(row.planning_notes_json, []),
    routePath: row.route_path,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: iso(row.updated_at)
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function newUuid() {
  return randomBytes(4).toString("hex");
}
