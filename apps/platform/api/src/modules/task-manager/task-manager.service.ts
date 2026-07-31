import { AppError } from "@cxapp/framework/errors";
import { TaskManagerRepository } from "./task-manager.repository.js";
import type { TodoInput, TodoLookupKind, TodoStatus } from "./task-manager.types.js";

const lookupKinds: TodoLookupKind[] = ["category", "group", "status", "priority"];

export class TaskManagerService {
  constructor(private readonly repository = new TaskManagerRepository()) {}

  list(scopeKey: string) {
    return this.repository.list(scopeKey);
  }

  listLookups(scopeKey: string) {
    return this.repository.listLookups(scopeKey);
  }

  createLookup(scopeKey: string, kind: TodoLookupKind, nameInput: string, createdBy?: string) {
    if (!lookupKinds.includes(kind)) throw AppError.validation("Lookup type is invalid.");
    const name = nameInput.trim();
    if (!name) throw AppError.validation("Lookup name is required.");
    return this.repository.createLookup(scopeKey, kind, name, createdBy ? { createdBy } : {});
  }

  create(scopeKey: string, input: TodoInput, createdBy?: string) {
    const title = input.title.trim();
    if (!title) throw AppError.validation("Todo title is required.");
    return this.repository.create(scopeKey, { ...input, title }, createdBy);
  }

  async update(scopeKey: string, id: string, input: Partial<TodoInput>) {
    const current = await this.repository.get(scopeKey, id);
    if (!current) throw AppError.notFound("Todo was not found.");
    if (input.title !== undefined && !input.title.trim()) {
      throw AppError.validation("Todo title is required.");
    }
    return this.repository.update(scopeKey, id, input);
  }

  async status(scopeKey: string, id: string, value: TodoStatus) {
    return this.update(scopeKey, id, { status: value });
  }

  async delete(scopeKey: string, id: string) {
    if (!(await this.repository.delete(scopeKey, id))) {
      throw AppError.notFound("Todo was not found.");
    }
    return { deleted: true, id };
  }

  reorder(scopeKey: string, orderedIds: string[]) {
    return this.repository.reorder(scopeKey, orderedIds);
  }
}
