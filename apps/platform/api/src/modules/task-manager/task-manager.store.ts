import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { Todo, TodoInput, TodoStatus } from "./task-manager.types.js";

const defaultDatabaseDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../task-manager-json"
);
const baseDir = process.env.TASK_MANAGER_JSON_DIR ?? defaultDatabaseDir;

export class TaskManagerJsonStore {
  async list(tenantKey: string) {
    return (await this.read(tenantKey)).sort(
      (a, b) => a.position - b.position || b.updatedAt.localeCompare(a.updatedAt)
    );
  }
  async get(tenantKey: string, id: string) {
    return (await this.read(tenantKey)).find((item) => item.id === id) ?? null;
  }
  async create(tenantKey: string, input: TodoInput) {
    const title = input.title.trim();
    if (!title) throw AppError.validation("Todo title is required.");
    const now = new Date().toISOString();
    const records = await this.read(tenantKey);
    const record: Todo = {
      id: `todo-${randomUUID().slice(0, 8)}`,
      title,
      description: String(input.description ?? ""),
      category: input.category ?? "work",
      groupName: String(input.groupName ?? "").trim(),
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      dueDate: String(input.dueDate ?? ""),
      position: records.length,
      createdAt: now,
      updatedAt: now
    };
    records.push(record);
    await this.write(tenantKey, records);
    return record;
  }
  async update(tenantKey: string, id: string, input: Partial<TodoInput>) {
    const records = await this.read(tenantKey);
    const current = records.find((item) => item.id === id);
    if (!current) throw AppError.notFound("Todo was not found.");
    const next = {
      ...current,
      ...input,
      title: String(input.title ?? current.title).trim(),
      groupName: String(input.groupName ?? current.groupName).trim(),
      updatedAt: new Date().toISOString()
    };
    if (!next.title) throw AppError.validation("Todo title is required.");
    await this.write(
      tenantKey,
      records.map((item) => (item.id === id ? next : item))
    );
    return next;
  }
  async setStatus(tenantKey: string, id: string, status: TodoStatus) {
    const current = await this.get(tenantKey, id);
    if (!current) throw AppError.notFound("Todo was not found.");
    return this.update(tenantKey, id, { status, title: current.title });
  }
  async delete(tenantKey: string, id: string) {
    const records = await this.read(tenantKey);
    if (!records.some((item) => item.id === id)) throw AppError.notFound("Todo was not found.");
    await this.write(
      tenantKey,
      records.filter((item) => item.id !== id)
    );
    return { id, deleted: true };
  }
  async reorder(tenantKey: string, orderedIds: string[]) {
    const records = await this.read(tenantKey);
    const known = new Set(records.map((item) => item.id));
    const ordered = orderedIds.filter((id) => known.has(id));
    const remaining = records.map((item) => item.id).filter((id) => !ordered.includes(id));
    const sequence = [...ordered, ...remaining];
    const updated = records.map((item) => ({
      ...item,
      position: sequence.indexOf(item.id),
      updatedAt: ordered.includes(item.id) ? new Date().toISOString() : item.updatedAt
    }));
    await this.write(tenantKey, updated);
    return updated.sort((a, b) => a.position - b.position);
  }
  private async read(tenantKey: string) {
    const file = fileFor(tenantKey);
    await ensure(file);
    const records = JSON.parse(await readFile(file, "utf8")) as Array<Partial<Todo>>;
    return records.map((item, index) => ({
      ...item,
      category: item.category ?? "work",
      groupName: String(item.groupName ?? ""),
      position: typeof item.position === "number" ? item.position : index
    })) as Todo[];
  }
  private async write(tenantKey: string, records: Todo[]) {
    const file = fileFor(tenantKey);
    await mkdir(baseDir, { recursive: true });
    await writeFile(file, JSON.stringify(records, null, 2), "utf8");
  }
}
function fileFor(tenantKey: string) {
  const safe = tenantKey.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  return join(baseDir, `${safe}-todos.json`);
}
async function ensure(file: string) {
  if (!existsSync(file)) {
    await mkdir(baseDir, { recursive: true });
    await writeFile(file, "[]", "utf8");
  }
}
