import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@codexsun/ui/components/button";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { TenantRoleForm } from "./tenant-role.form";
import { useTenantRoleMutations, useTenantRolesQuery } from "./tenant-role.hooks";
import { TenantRoleList } from "./tenant-role.list";
import type { TenantRole, TenantRoleSavePayload } from "./tenant-role.types";
type PendingAction = { record: TenantRole; type: "force-delete" | "restore" | "suspend" };
export function TenantRoleWorkspace() {
  const query = useTenantRolesQuery();
  const mutations = useTenantRoleMutations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<TenantRole | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          record.label.toLowerCase().includes(term) ||
          record.key.toLowerCase().includes(term) ||
          record.description.toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const saveError = mutations.create.error ?? mutations.update.error;
  async function save(value: TenantRoleSavePayload) {
    try {
      const record = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`Role ${editing ? "updated" : "created"}`, { description: record.label });
      setEditing(undefined);
    } catch {}
  }
  async function act(action: PendingAction) {
    try {
      const record =
        action.type === "force-delete"
          ? await mutations.forceDelete.mutateAsync(action.record)
          : action.type === "restore"
            ? await mutations.activate.mutateAsync(action.record)
            : await mutations.deactivate.mutateAsync(action.record);
      toast.success(
        action.type === "force-delete"
          ? "Role permanently deleted"
          : action.type === "restore"
            ? "Role restored"
            : "Role suspended",
        { description: record.label }
      );
      setPendingAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The role action failed.");
    }
  }
  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New role
          </Button>
        </div>
      }
      description="Manage tenant roles and their lifecycle."
      technicalName="page.application.access.roles"
      title="Roles"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All roles" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
        filterValue={status}
        onFilterValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search roles"
        searchValue={search}
      />
      <TenantRoleList
        loading={query.isFetching && !query.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={records}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
        singularLabel="role"
        totalCount={filtered.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <TenantRoleForm
        {...(saveError instanceof Error ? { error: saveError.message } : {})}
        loading={mutations.create.isPending || mutations.update.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => void save(value)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <RoleActionDialog
        action={pendingAction}
        loading={
          mutations.activate.isPending ||
          mutations.deactivate.isPending ||
          mutations.forceDelete.isPending
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && void act(pendingAction)}
      />
    </WorkspacePage>
  );
}
function RoleActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: PendingAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = action?.type === "force-delete";
  const verb = action?.type === "restore" ? "Restore" : destructive ? "Force delete" : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} role?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.label ?? "This role"} will be permanently removed. Assignments may block deletion.`
              : `${action?.record.label ?? "This role"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            disabled={loading}
            onClick={onConfirm}
          >
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
