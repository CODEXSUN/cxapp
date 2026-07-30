import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { TodoLookup, TodoLookupKind } from "./task-manager.types.js";

const defaultDatabaseDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../task-manager-json"
);
const baseDir = process.env.TASK_MANAGER_JSON_DIR ?? defaultDatabaseDir;
const kinds: TodoLookupKind[] = ["category", "group", "status", "priority"];
const defaults: Array<Pick<TodoLookup, "kind" | "name" | "value">> = [
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

export class TaskManagerLookupStore {
  async list(tenantKey: string) {
    return this.read(tenantKey);
  }

  async create(tenantKey: string, kind: TodoLookupKind, nameInput: string) {
    if (!kinds.includes(kind)) throw AppError.validation("Lookup type is invalid.");
    const name = nameInput.trim();
    if (!name) throw AppError.validation("Lookup name is required.");
    const records = await this.read(tenantKey);
    const duplicate = records.find(
      (item) => item.kind === kind && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return duplicate;
    const record: TodoLookup = {
      id: `lookup-${randomUUID().slice(0, 8)}`,
      kind,
      name,
      value: toValue(name),
      createdAt: new Date().toISOString()
    };
    records.push(record);
    await this.write(tenantKey, records);
    return record;
  }

  private async read(tenantKey: string) {
    const file = fileFor(tenantKey);
    if (!existsSync(file)) {
      const createdAt = new Date().toISOString();
      const records = defaults.map((item, index) => ({
        ...item,
        id: `lookup-default-${index}`,
        createdAt
      }));
      await this.write(tenantKey, records);
      return records;
    }
    return JSON.parse(await readFile(file, "utf8")) as TodoLookup[];
  }

  private async write(tenantKey: string, records: TodoLookup[]) {
    await mkdir(baseDir, { recursive: true });
    await writeFile(fileFor(tenantKey), JSON.stringify(records, null, 2), "utf8");
  }
}

function fileFor(tenantKey: string) {
  const safe = tenantKey.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  return join(baseDir, `${safe}-todo-lookups.json`);
}

function toValue(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || randomUUID().slice(0, 8)
  );
}
