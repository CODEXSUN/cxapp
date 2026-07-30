import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Todo, TodoInput, TodoLookup, TodoLookupKind, TodoStatus } from "./task-manager.types";
export const listTodos = () => apiGet<Todo[]>("/task-manager/todos", "sa");
export const listTodoLookups = () => apiGet<TodoLookup[]>("/task-manager/lookups", "sa");
export const createTodoLookup = (kind: TodoLookupKind, name: string) =>
  apiPost<TodoLookup>("/task-manager/lookups", { kind, name }, "sa");
export const createTodo = (input: TodoInput) => apiPost<Todo>("/task-manager/todos", input, "sa");
export const reorderTodos = (orderedIds: string[]) =>
  apiPost<Todo[]>("/task-manager/todos/reorder", { orderedIds }, "sa");
export const updateTodo = (id: string, input: Partial<TodoInput>) =>
  apiPut<Todo>(`/task-manager/todos/${id}`, input, "sa");
export const setTodoStatus = (id: string, status: TodoStatus) =>
  apiPost<Todo>(`/task-manager/todos/${id}/status`, { status }, "sa");
export const deleteTodo = (id: string) =>
  apiDelete<{ id: string; deleted: boolean }>(`/task-manager/todos/${id}`, "sa");
