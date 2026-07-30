import { TaskManagerJsonStore } from "./task-manager.store.js";
import type { TodoInput, TodoStatus } from "./task-manager.types.js";
export class TaskManagerService {
  constructor(private readonly store = new TaskManagerJsonStore()) {}
  list(tenant: string) {
    return this.store.list(tenant);
  }
  create(tenant: string, input: TodoInput) {
    return this.store.create(tenant, input);
  }
  update(tenant: string, id: string, input: Partial<TodoInput>) {
    return this.store.update(tenant, id, input);
  }
  status(tenant: string, id: string, value: TodoStatus) {
    return this.store.setStatus(tenant, id, value);
  }
  delete(tenant: string, id: string) {
    return this.store.delete(tenant, id);
  }
}
