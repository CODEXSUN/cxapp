import { apiDelete, apiGet, apiPost, apiPut, type Desk } from "../../shared/api/platform-api";
import type { Todo, TodoInput, TodoLookup, TodoLookupKind, TodoStatus } from "./task-manager.types";
export type TaskManagerDesk = Extract<Desk, "sa" | "tenant">;
export const listTodos = (desk: TaskManagerDesk) => apiGet<Todo[]>("/task-manager/todos", desk);
export const listTodoLookups = (desk: TaskManagerDesk) =>
  apiGet<TodoLookup[]>("/task-manager/lookups", desk);
export const createTodoLookup = (desk: TaskManagerDesk, kind: TodoLookupKind, name: string) =>
  apiPost<TodoLookup>("/task-manager/lookups", { kind, name }, desk);
export const createTodo = (desk: TaskManagerDesk, input: TodoInput) =>
  apiPost<Todo>("/task-manager/todos", input, desk);
export const reorderTodos = (desk: TaskManagerDesk, orderedIds: string[]) =>
  apiPost<Todo[]>("/task-manager/todos/reorder", { orderedIds }, desk);
export const updateTodo = (desk: TaskManagerDesk, id: string, input: Partial<TodoInput>) =>
  apiPut<Todo>(`/task-manager/todos/${id}`, input, desk);
export const setTodoStatus = (desk: TaskManagerDesk, id: string, status: TodoStatus) =>
  apiPost<Todo>(`/task-manager/todos/${id}/status`, { status }, desk);
export const deleteTodo = (desk: TaskManagerDesk, id: string) =>
  apiDelete<{ id: string; deleted: boolean }>(`/task-manager/todos/${id}`, desk);
