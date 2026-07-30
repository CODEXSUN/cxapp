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
import { TenantRolePermissionForm } from "./tenant-role-permission.form";
import {
  useTenantRolePermissionLookups,
  useTenantRolePermissionMutations,
  useTenantRolePermissionsQuery
} from "./tenant-role-permission.hooks";
import { TenantRolePermissionList } from "./tenant-role-permission.list";
import type {
  TenantRolePermission,
  TenantRolePermissionSavePayload
} from "./tenant-role-permission.types";

type PendingAction = { record: TenantRolePermission; type: "force-delete" | "restore" | "suspend" };

export function TenantRolePermissionWorkspace() {
  const query = useTenantRolePermissionsQuery();
  const lookups = useTenantRolePermissionLookups();
  const mutations = useTenantRolePermissionMutations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<TenantRolePermission | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          record.roleLabel.toLowerCase().includes(term) ||
          record.roleKey.toLowerCase().includes(term) ||
          record.permissionLabel.toLowerCase().includes(term) ||
          record.permissionKey.toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const saveError = mutations.create.error ?? mutations.update.error;

  async function save(value: TenantRolePermissionSavePayload) {
    try {
      const record = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`Role permission ${editing ? "updated" : "granted"}`, {
        description: `${record.roleLabel} · ${record.permissionLabel}`
      });
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
          ? "Role permission permanently removed"
          : action.type === "restore"
            ? "Role permission restored"
            : "Role permission suspended",
        { description: `${record.roleLabel} · ${record.permissionLabel}` }
      );
      setPendingAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The role-permission action failed.");
    }
  }

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={query.isFetching || lookups.isFetching}
            onClick={() => {
              void query.refetch();
              void lookups.refetch();
            }}
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={cn("size-4", (query.isFetching || lookups.isFetching) && "animate-spin")}
            />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New role permission
          </Button>
        </div>
      }
      description="Grant tenant permissions to tenant roles."
      technicalName="page.application.access.role-permissions"
      title="Role Permissions"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All role permissions" },
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
        searchPlaceholder="Search role permissions"
        searchValue={search}
      />
      <TenantRolePermissionList
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
        singularLabel="role permission"
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
      <TenantRolePermissionForm
        {...(saveError instanceof Error ? { error: saveError.message } : {})}
        loading={mutations.create.isPending || mutations.update.isPending}
        lookupLoading={lookups.isLoading}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => void save(value)}
        open={editing !== undefined}
        permissions={lookups.data?.second ?? []}
        record={editing ?? null}
        roles={lookups.data?.first ?? []}
      />
      <RolePermissionActionDialog
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

function RolePermissionActionDialog({
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
  const label = action
    ? `${action.record.roleLabel} · ${action.record.permissionLabel}`
    : "This role permission";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} role permission?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${label} will be permanently removed.`
              : `${label} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
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
