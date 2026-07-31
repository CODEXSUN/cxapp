import { randomBytes } from "node:crypto";
import type { Kysely } from "kysely";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { TaskManagerDatabase } from "./task-manager.migration.js";
import type { Todo, TodoInput, TodoLookup, TodoLookupKind } from "./task-manager.types.js";

export class TaskManagerRepository {
  constructor(
    private readonly database: Kysely<TaskManagerDatabase> = getPlatformDatabase() as unknown as Kysely<TaskManagerDatabase>
  ) {}

  async list(scopeKey: string) {
    const rows = await this.database
      .selectFrom("task_manager_todos")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .orderBy("position", "asc")
      .orderBy("updated_at", "desc")
      .execute();
    return rows.map(toTodo);
  }

  async get(scopeKey: string, uuid: string) {
    const row = await this.database
      .selectFrom("task_manager_todos")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return row ? toTodo(row) : null;
  }

  async create(scopeKey: string, input: TodoInput, createdBy = "super-admin") {
    const last = await this.database
      .selectFrom("task_manager_todos")
      .select("position")
      .where("scope_key", "=", scopeKey)
      .orderBy("position", "desc")
      .executeTakeFirst();
    const result = await this.database
      .insertInto("task_manager_todos")
      .values({
        category: input.category ?? "work",
        created_by: createdBy,
        description: String(input.description ?? ""),
        due_date: String(input.dueDate ?? ""),
        group_name: String(input.groupName ?? "").trim(),
        position: Number(last?.position ?? -1) + 1,
        priority: input.priority ?? "medium",
        scope_key: scopeKey,
        status: input.status ?? "open",
        title: input.title.trim(),
        uuid: createUuid()
      })
      .executeTakeFirst();
    return this.findByInternalId(Number(result.insertId));
  }

  async update(scopeKey: string, uuid: string, input: Partial<TodoInput>) {
    const values: Record<string, unknown> = { updated_at: new Date() };
    if (input.title !== undefined) values.title = input.title.trim();
    if (input.description !== undefined) values.description = String(input.description);
    if (input.category !== undefined) values.category = input.category;
    if (input.groupName !== undefined) values.group_name = String(input.groupName).trim();
    if (input.status !== undefined) values.status = input.status;
    if (input.priority !== undefined) values.priority = input.priority;
    if (input.dueDate !== undefined) values.due_date = String(input.dueDate);
    await this.database
      .updateTable("task_manager_todos")
      .set(values)
      .where("scope_key", "=", scopeKey)
      .where("uuid", "=", uuid)
      .execute();
    return this.get(scopeKey, uuid);
  }

  async delete(scopeKey: string, uuid: string) {
    const result = await this.database
      .deleteFrom("task_manager_todos")
      .where("scope_key", "=", scopeKey)
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return Number(result.numDeletedRows ?? 0) > 0;
  }

  async reorder(scopeKey: string, orderedIds: string[]) {
    await this.database.transaction().execute(async (transaction) => {
      const rows = await transaction
        .selectFrom("task_manager_todos")
        .select(["id", "uuid"])
        .where("scope_key", "=", scopeKey)
        .orderBy("position", "asc")
        .execute();
      const known = new Set(rows.map((row) => row.uuid));
      const requested = [...new Set(orderedIds)].filter((uuid) => known.has(uuid));
      const sequence = [
        ...requested,
        ...rows.map((row) => row.uuid).filter((uuid) => !requested.includes(uuid))
      ];
      await Promise.all(
        sequence.map((uuid, position) =>
          transaction
            .updateTable("task_manager_todos")
            .set({ position, updated_at: new Date() })
            .where("scope_key", "=", scopeKey)
            .where("uuid", "=", uuid)
            .execute()
        )
      );
    });
    return this.list(scopeKey);
  }

  async listLookups(scopeKey: string) {
    const rows = await this.database
      .selectFrom("task_manager_lookups")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("status", "=", "active")
      .orderBy("kind", "asc")
      .orderBy("name", "asc")
      .execute();
    return rows.map(toLookup);
  }

  async createLookup(
    scopeKey: string,
    kind: TodoLookupKind,
    name: string,
    options: { createdBy?: string; uuid?: string; value?: string } = {}
  ) {
    const existing = await this.database
      .selectFrom("task_manager_lookups")
      .selectAll()
      .where("scope_key", "=", scopeKey)
      .where("kind", "=", kind)
      .where("name", "=", name)
      .executeTakeFirst();
    if (existing) return toLookup(existing);
    const result = await this.database
      .insertInto("task_manager_lookups")
      .values({
        created_by: options.createdBy ?? "super-admin",
        kind,
        name,
        scope_key: scopeKey,
        status: "active",
        uuid: options.uuid ?? createUuid(),
        value: options.value ?? toValue(name)
      })
      .executeTakeFirst();
    return this.findLookupByInternalId(Number(result.insertId));
  }

  async importTodo(scopeKey: string, todo: Todo) {
    await this.database
      .insertInto("task_manager_todos")
      .values({
        category: todo.category,
        created_at: new Date(todo.createdAt),
        created_by: "system:legacy-json-import",
        description: todo.description,
        due_date: todo.dueDate,
        group_name: todo.groupName,
        position: todo.position,
        priority: todo.priority,
        scope_key: scopeKey,
        status: todo.status,
        title: todo.title,
        updated_at: new Date(todo.updatedAt),
        uuid: normalizeLegacyUuid(todo.id)
      })
      .ignore()
      .execute();
  }

  private async findByInternalId(id: number) {
    const row = await this.database
      .selectFrom("task_manager_todos")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    return toTodo(row);
  }

  private async findLookupByInternalId(id: number) {
    const row = await this.database
      .selectFrom("task_manager_lookups")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    return toLookup(row);
  }
}

function createUuid() {
  return randomBytes(4).toString("hex");
}

function normalizeLegacyUuid(value: string) {
  const suffix = value.toLowerCase().match(/[a-f0-9]{8}$/)?.[0];
  return suffix ?? createUuid();
}

function toValue(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || createUuid()
  );
}

function toTodo(row: {
  category: string;
  created_at: Date | string;
  description: string;
  due_date: string;
  group_name: string;
  position: number;
  priority: string;
  status: string;
  title: string;
  updated_at: Date | string;
  uuid: string;
}): Todo {
  return {
    category: row.category,
    createdAt: new Date(row.created_at).toISOString(),
    description: row.description,
    dueDate: row.due_date,
    groupName: row.group_name,
    id: row.uuid,
    position: Number(row.position),
    priority: row.priority,
    status: row.status,
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function toLookup(row: {
  created_at: Date | string;
  kind: TodoLookupKind;
  name: string;
  updated_at: Date | string;
  uuid: string;
  value: string;
}): TodoLookup {
  return {
    createdAt: new Date(row.created_at).toISOString(),
    id: row.uuid,
    kind: row.kind,
    name: row.name,
    updatedAt: new Date(row.updated_at).toISOString(),
    value: row.value
  };
}
