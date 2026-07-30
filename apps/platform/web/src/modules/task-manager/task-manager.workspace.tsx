import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@codexsun/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui/components/alert-dialog";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceLookup, type WorkspaceLookupOption } from "@codexsun/ui/workspace/lookup";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceMinimalEditor } from "@codexsun/ui/workspace/minimal-editor";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import {
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import {
  createTodo,
  createTodoLookup,
  deleteTodo,
  listTodoLookups,
  listTodos,
  reorderTodos,
  setTodoStatus,
  updateTodo
} from "./task-manager.services";
import type {
  Todo,
  TodoInput,
  TodoLookup,
  TodoLookupKind,
  TodoPriority,
  TodoStatus
} from "./task-manager.types";

export function TaskManagerWorkspace() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["task-manager", "todos"],
    queryFn: listTodos,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });
  const lookupQuery = useQuery({
    queryKey: ["task-manager", "lookups"],
    queryFn: listTodoLookups
  });
  const [editing, setEditing] = useState<Todo | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const refresh = () => client.invalidateQueries({ queryKey: ["task-manager", "todos"] });
  const lookupOptions = (kind: TodoLookupKind) => toLookupOptions(lookupQuery.data ?? [], kind);
  const addLookup = async (kind: TodoLookupKind, name: string) => {
    const created = await createTodoLookup(kind, name);
    await client.invalidateQueries({ queryKey: ["task-manager", "lookups"] });
    return { label: created.name, value: kind === "group" ? created.name : created.value };
  };
  const save = useMutation({
    mutationFn: (input: TodoInput) =>
      editing?.id ? updateTodo(editing.id, input) : createTodo(input),
    onSuccess: async (todo) => {
      await refresh();
      setEditing(null);
      toast.success("Todo saved", { description: todo.title });
    },
    onError: (error) =>
      toast.error("Todo could not be saved", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: TodoStatus }) => setTodoStatus(id, value),
    onSuccess: refresh
  });
  const remove = useMutation({
    mutationFn: deleteTodo,
    onSuccess: async ({ id }) => {
      await refresh();
      toast.success("Todo deleted");
      if (editing?.id === id) setEditing(null);
    },
    onError: (error) =>
      toast.error("Todo could not be deleted", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });
  const reorder = useMutation({
    mutationFn: reorderTodos,
    onSuccess: refresh,
    onError: () => toast.error("Todo order could not be saved")
  });
  const groupOptions = useMemo(
    () => [
      { label: "All groups / clients", value: "all" },
      { label: "No group / client", value: "__none__" },
      ...toLookupOptions(lookupQuery.data ?? [], "group").map((option) => ({
        label: option.label,
        value: option.label
      }))
    ],
    [lookupQuery.data]
  );
  const todos = useMemo(
    () =>
      (query.data ?? []).filter(
        (todo) =>
          (statusFilter === "all" || todo.status === statusFilter) &&
          (categoryFilter === "all" || todo.category === categoryFilter) &&
          (groupFilter === "all" ||
            (groupFilter === "__none__" ? !todo.groupName : todo.groupName === groupFilter)) &&
          `${todo.title} ${todo.description} ${todo.category} ${todo.groupName} ${todo.priority} ${todo.status}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [categoryFilter, groupFilter, query.data, search, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(todos.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageTodos = todos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  return (
    <WorkspacePage
      title="Task Manager"
      description="Plan and complete Super Admin Todos in a lightweight workspace."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            onClick={() =>
              setEditing({
                id: "",
                title: "",
                description: "",
                category: "work",
                groupName: "",
                status: "open",
                priority: "medium",
                dueDate: "",
                position: 0,
                createdAt: "",
                updatedAt: ""
              })
            }
          >
            <Plus className="size-4" />
            New Todo
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        className="mt-4"
        filterOptions={[
          { id: "all", label: "All Todos" },
          ...lookupOptions("status").map((option) => ({ id: option.value, label: option.label }))
        ]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search Todos"
        searchValue={search}
        toolbarAction={
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <WorkspaceSelect
              options={[{ label: "All categories", value: "all" }, ...lookupOptions("category")]}
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            />
            <WorkspaceSelect
              options={groupOptions}
              value={groupFilter}
              onValueChange={(value) => {
                setGroupFilter(value);
                setPage(1);
              }}
            />
          </div>
        }
      />
      {editing ? (
        <TodoForm
          key={editing.id || "new"}
          value={editing}
          lookups={lookupQuery.data ?? []}
          saving={save.isPending}
          onCreateLookup={addLookup}
          onCancel={() => setEditing(null)}
          onSave={(value) => save.mutate(value)}
        />
      ) : null}
      <div className="mt-4 overflow-x-auto rounded-md border bg-card shadow-sm">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = pageTodos.findIndex((todo) => todo.id === active.id);
            const newIndex = pageTodos.findIndex((todo) => todo.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            reorder.mutate(arrayMove(pageTodos, oldIndex, newIndex).map((todo) => todo.id));
          }}
          sensors={sensors}
        >
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-12 px-2 py-3" aria-label="Reorder" />
                <th className="px-4 py-3 text-left">Todo</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Group / Client</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Due date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={pageTodos.map((todo) => todo.id)}
                strategy={verticalListSortingStrategy}
              >
                {pageTodos.map((todo) => (
                  <SortableTodoRow
                    key={todo.id}
                    lookups={lookupQuery.data ?? []}
                    todo={todo}
                    onEdit={setEditing}
                    onComplete={(id) => status.mutate({ id, value: "completed" })}
                    onDelete={() => setDeleting(todo)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
        {!todos.length ? (
          <p className="p-10 text-center text-muted-foreground">No Todos found.</p>
        ) : null}
      </div>
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, todos.length)}
        singularLabel="Todo"
        totalCount={todos.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Todo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{deleting?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={() => {
                if (deleting) {
                  remove.mutate(deleting.id);
                  setDeleting(null);
                }
              }}
            >
              Delete Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
function SortableTodoRow({
  todo,
  lookups,
  onEdit,
  onComplete,
  onDelete
}: {
  todo: Todo;
  lookups: TodoLookup[];
  onEdit: (todo: Todo) => void;
  onComplete: (id: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id
  });
  return (
    <tr
      ref={setNodeRef}
      className="border-b last:border-0"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1
      }}
    >
      <td className="px-2 py-3">
        <Button
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${todo.title}`}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          size="icon"
          title="Drag to reorder"
          type="button"
          variant="ghost"
        >
          <GripVertical className="size-4" />
        </Button>
      </td>
      <td className="px-4 py-3">
        <button
          className={`text-left font-medium hover:underline ${todo.status === "completed" ? "text-emerald-700 line-through decoration-emerald-600" : ""}`}
          type="button"
          onClick={() => onEdit(todo)}
        >
          {todo.title}
        </button>
        {todo.description ? (
          <div
            className={`mt-1 max-w-[44rem] truncate text-xs text-muted-foreground ${todo.status === "completed" ? "line-through decoration-emerald-500" : ""}`}
            title={todo.description}
          >
            {descriptionPreview(todo.description)}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3">{lookupLabel(lookups, "category", todo.category)}</td>
      <td className="px-4 py-3">{todo.groupName || "-"}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${prioritySwatch(todo.priority)}`}
          />
          {lookupLabel(lookups, "priority", todo.priority)}
        </span>
      </td>
      <td className="px-4 py-3">{formatTodoDate(todo.dueDate)}</td>
      <td className="px-4 py-3">
        <WorkspaceStatusBadge
          label={lookupLabel(lookups, "status", todo.status)}
          tone={statusTone(todo.status)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="outline" title="Edit" onClick={() => onEdit(todo)}>
            <Pencil className="size-4" />
          </Button>
          {todo.status !== "completed" ? (
            <Button
              size="icon"
              variant="outline"
              title="Complete"
              onClick={() => onComplete(todo.id)}
            >
              <Check className="size-4" />
            </Button>
          ) : null}
          <Button size="icon" variant="outline" title="Delete" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
function TodoForm({
  value,
  lookups,
  saving,
  onCreateLookup,
  onCancel,
  onSave
}: {
  value: Todo;
  lookups: TodoLookup[];
  saving: boolean;
  onCreateLookup: (kind: TodoLookupKind, name: string) => Promise<WorkspaceLookupOption>;
  onCancel: () => void;
  onSave: (value: TodoInput) => void;
}) {
  const [form, setForm] = useState<TodoInput>({
    title: value.title,
    description: value.description,
    category: value.category,
    groupName: value.groupName,
    status: value.status,
    priority: value.priority,
    dueDate: value.dueDate
  });
  const patch = (key: keyof TodoInput, next: string) =>
    setForm((current) => ({ ...current, [key]: next }));
  return (
    <WorkspaceUpsertDialog
      className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      description="Capture a Super Admin task with its status and priority."
      open
      onClose={onCancel}
      title={`${value.id ? "Edit" : "New"} Todo`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.title.trim()) return;
          onSave(form);
        }}
      >
        <WorkspaceFormGrid columns={2}>
          <WorkspaceFormField label="Todo title" required>
            <Input
              required
              value={form.title}
              onChange={(event) => patch("title", event.target.value)}
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Due date">
            <WorkspaceDatePicker
              value={form.dueDate ?? ""}
              onValueChange={(value) => patch("dueDate", value)}
            />
          </WorkspaceFormField>
          <TodoLookupField
            kind="category"
            label="Category"
            lookups={lookups}
            value={String(form.category ?? "work")}
            onCreate={onCreateLookup}
            onValueChange={(next) => patch("category", next)}
          />
          <TodoLookupField
            kind="group"
            label="Group / Client"
            lookups={lookups}
            value={form.groupName ?? ""}
            onCreate={onCreateLookup}
            onValueChange={(next, option) => patch("groupName", option?.label ?? next)}
          />
          <TodoLookupField
            kind="status"
            label="Status"
            lookups={lookups}
            value={String(form.status ?? "open")}
            onCreate={onCreateLookup}
            onValueChange={(next) => patch("status", next)}
          />
          <TodoLookupField
            kind="priority"
            label="Priority"
            lookups={lookups}
            value={String(form.priority ?? "medium")}
            onCreate={onCreateLookup}
            onValueChange={(next) => patch("priority", next)}
          />
          <WorkspaceFormField className="md:col-span-2" label="Description">
            <WorkspaceMinimalEditor
              content={form.description ?? ""}
              onChange={(value) => patch("description", value)}
            />
          </WorkspaceFormField>
        </WorkspaceFormGrid>
        <WorkspaceFormFooter
          className="mt-6 border-t pt-4"
          onCancel={onCancel}
          primaryLabel="Save Todo"
          primaryLoading={saving}
        />
      </form>
    </WorkspaceUpsertDialog>
  );
}
function TodoLookupField({
  kind,
  label,
  lookups,
  onCreate,
  onValueChange,
  value
}: {
  kind: TodoLookupKind;
  label: string;
  lookups: TodoLookup[];
  onCreate: (kind: TodoLookupKind, name: string) => Promise<WorkspaceLookupOption>;
  onValueChange: (value: string, option?: WorkspaceLookupOption | null) => void;
  value: string;
}) {
  return (
    <WorkspaceFormField label={label}>
      <WorkspaceLookup
        allowTextValue={false}
        createLabel={`Add ${label}`}
        createMode="inline"
        emptyLabel={`No ${label.toLowerCase()} found. Type a name to add it.`}
        loading={false}
        options={toLookupOptions(lookups, kind)}
        placeholder={`Search or add ${label.toLowerCase()}`}
        value={value}
        onCreate={(name) => onCreate(kind, name)}
        onValueChange={onValueChange}
      />
    </WorkspaceFormField>
  );
}

function toLookupOptions(lookups: TodoLookup[], kind: TodoLookupKind): WorkspaceLookupOption[] {
  return lookups
    .filter((item) => item.kind === kind)
    .map((item) => ({ label: item.name, value: kind === "group" ? item.name : item.value }));
}

function lookupLabel(lookups: TodoLookup[], kind: TodoLookupKind, value: string) {
  return (
    lookups.find((item) => item.kind === kind && item.value === value)?.name ?? statusLabel(value)
  );
}

function prioritySwatch(priority: TodoPriority) {
  return priority === "urgent"
    ? "bg-rose-600"
    : priority === "high"
      ? "bg-orange-500"
      : priority === "medium"
        ? "bg-amber-500"
        : "bg-sky-500";
}

function statusLabel(status: TodoStatus) {
  return status
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function statusTone(status: TodoStatus) {
  return status === "completed"
    ? "success"
    : status === "in-progress" || status === "review"
      ? "info"
      : status === "blocked" || status === "cancelled"
        ? "danger"
        : "warning";
}

function formatTodoDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function descriptionPreview(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
