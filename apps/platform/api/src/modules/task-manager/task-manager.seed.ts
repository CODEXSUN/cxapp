import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import { env } from "../../env.js";
import type { TaskManagerDatabase } from "./task-manager.migration.js";
import { TaskManagerRepository } from "./task-manager.repository.js";
import type { Todo, TodoLookup, TodoLookupKind } from "./task-manager.types.js";

const superAdminScope = "super-admin";
const defaults: Array<{ kind: TodoLookupKind; name: string; value: string }> = [
  { kind: "category", name: "Work", value: "work" },
  { kind: "category", name: "Personal", value: "personal" },
  { kind: "category", name: "Other", value: "other" },
  { kind: "status", name: "Backlog", value: "backlog" },
  { kind: "status", name: "Open", value: "open" },
  { kind: "status", name: "In progress", value: "in-progress" },
  { kind: "status", name: "In review", value: "review" },
  { kind: "status", name: "Blocked", value: "blocked" },
  { kind: "status", name: "Completed", value: "completed" },
  { kind: "status", name: "Cancelled", value: "cancelled" },
  { kind: "priority", name: "Low", value: "low" },
  { kind: "priority", name: "Medium", value: "medium" },
  { kind: "priority", name: "High", value: "high" },
  { kind: "priority", name: "Urgent", value: "urgent" }
];

export async function seedTaskManagerModule<Database extends TaskManagerDatabase>(
  db: Kysely<Database>,
  options: { importLegacyJson?: boolean; scopeKey?: string } = {}
) {
  const scopeKey = options.scopeKey ?? superAdminScope;
  const repository = new TaskManagerRepository(db as unknown as Kysely<TaskManagerDatabase>);
  for (const item of defaults) {
    await repository.createLookup(scopeKey, item.kind, item.name, {
      createdBy: "system:seed",
      value: item.value
    });
  }

  const imported =
    options.importLegacyJson === false ? 0 : await importLegacyJson(repository, scopeKey);
  return { imported, module: "platform.task-manager", seeded: defaults.length } as const;
}

async function importLegacyJson(repository: TaskManagerRepository, scopeKey: string) {
  const baseDir = env.TASK_MANAGER_JSON_DIR;
  if (!baseDir.trim()) return 0;
  let imported = 0;

  const todos = await readJsonFile<Partial<Todo>[]>(
    join(baseDir, `${superAdminScope}-todos.json`),
    []
  );
  for (const [position, item] of todos.entries()) {
    if (!item.id || !item.title) continue;
    const now = new Date().toISOString();
    await repository.importTodo(scopeKey, {
      category: item.category ?? "work",
      createdAt: validDate(item.createdAt, now),
      description: String(item.description ?? ""),
      dueDate: String(item.dueDate ?? ""),
      groupName: String(item.groupName ?? ""),
      id: item.id,
      position: typeof item.position === "number" ? item.position : position,
      priority: item.priority ?? "medium",
      status: item.status ?? "open",
      title: item.title.trim(),
      updatedAt: validDate(item.updatedAt, now)
    });
    imported += 1;
  }

  const lookups = await readJsonFile<Partial<TodoLookup>[]>(
    join(baseDir, `${superAdminScope}-todo-lookups.json`),
    []
  );
  for (const item of lookups) {
    if (!isLookupKind(item.kind) || !item.name?.trim()) continue;
    const value = item.value?.trim();
    await repository.createLookup(scopeKey, item.kind, item.name.trim(), {
      createdBy: "system:legacy-json-import",
      ...(value ? { value } : {})
    });
    imported += 1;
  }
  return imported;
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    console.warn(`[seeder] Task Manager legacy JSON import skipped for "${path}".`, error);
    return fallback;
  }
}

function isLookupKind(value: unknown): value is TodoLookupKind {
  return value === "category" || value === "group" || value === "status" || value === "priority";
}

function validDate(value: string | undefined, fallback: string) {
  return value && !Number.isNaN(Date.parse(value)) ? value : fallback;
}
