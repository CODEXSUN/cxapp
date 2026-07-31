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
} from "@cxapp/ui/components/alert-dialog";
import { Button } from "@cxapp/ui/components/button";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspaceFilters } from "@cxapp/ui/workspace/filters";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspacePagination } from "@cxapp/ui/workspace/pagination";
import { WorkspaceShowCard } from "@cxapp/ui/workspace/show";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormPanel
} from "@cxapp/ui/workspace/upsert";
import { buildShowingLabel } from "@cxapp/ui/workspace/utils";
import { TenantUserForm } from "./tenant-user.form";
import {
  useTenantUserMutations,
  useTenantUsersQuery,
  useTenantUserTenantsQuery
} from "./tenant-user.hooks";
import { TenantUserList } from "./tenant-user.list";
import type { TenantUser, TenantUserSavePayload, TenantUserScope } from "./tenant-user.types";
type PendingAction = { record: TenantUser; type: "force-delete" | "restore" | "suspend" };
export function TenantUserWorkspace({ mode = "tenant" }: { mode?: "super-admin" | "tenant" }) {
  const superAdmin = mode === "super-admin";
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const tenantQuery = useTenantUserTenantsQuery(superAdmin);
  const scope: TenantUserScope = superAdmin
    ? { desk: "sa", tenantId: selectedTenantId ?? 0 }
    : { desk: "tenant" };
  const canManage = !superAdmin || selectedTenantId !== null;
  const query = useTenantUsersQuery(scope, canManage);
  const mutations = useTenantUserMutations(scope);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<TenantUser | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const selectedTenant = (tenantQuery.data ?? []).find((tenant) => tenant.id === selectedTenantId);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          record.name.toLowerCase().includes(term) ||
          record.email.toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setEditing(undefined);
    setPendingAction(null);
    setSearch("");
    setStatus("all");
    setPage(1);
  }, [selectedTenantId]);
  const saveError = mutations.create.error ?? mutations.update.error;
  async function save(value: TenantUserSavePayload) {
    try {
      const record = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`User ${editing ? "updated" : "created"}`, { description: record.name });
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
          ? "User permanently deleted"
          : action.type === "restore"
            ? "User restored"
            : "User suspended",
        { description: record.name }
      );
      setPendingAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The user action failed.");
    }
  }
  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={query.isFetching || (superAdmin && !canManage)}
            onClick={() => {
              if (superAdmin) void tenantQuery.refetch();
              if (canManage) void query.refetch();
            }}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={!canManage}
            onClick={() => setEditing(null)}
            type="button"
          >
            <Plus className="size-4" />
            New user
          </Button>
        </div>
      }
      description={
        superAdmin
          ? "Select a tenant, then manage its users, credentials, and account lifecycle."
          : "Manage tenant users, credentials, and account lifecycle."
      }
      technicalName={
        superAdmin ? "page.super-admin.tenant-user-manager" : "page.application.access.users"
      }
      title={superAdmin ? "Tenant User Manager" : "Users"}
    >
      {superAdmin ? (
        <WorkspaceFormPanel
          description="User records are read from the selected tenant database."
          title="Select tenant"
        >
          {tenantQuery.error instanceof Error ? (
            <WorkspaceFormBanner title="Unable to load tenants">
              {tenantQuery.error.message}
            </WorkspaceFormBanner>
          ) : null}
          <div className="max-w-xl">
            <WorkspaceFormField label="Tenant" required>
              <WorkspaceLookup
                allowTextValue={false}
                loading={tenantQuery.isLoading}
                options={(tenantQuery.data ?? []).map((tenant) => ({
                  description: `${tenant.tenantCode} · ${tenant.status}`,
                  label: tenant.tenantName,
                  value: String(tenant.id)
                }))}
                showAllOptionsOnFocus
                value={selectedTenantId ? String(selectedTenantId) : ""}
                onValueChange={(value) => setSelectedTenantId(Number(value) || null)}
              />
            </WorkspaceFormField>
          </div>
        </WorkspaceFormPanel>
      ) : null}
      {canManage ? (
        <>
          {query.error instanceof Error ? (
            <WorkspaceFormBanner title="Unable to load users">
              {query.error.message}
            </WorkspaceFormBanner>
          ) : null}
          <WorkspaceFilters
            filterOptions={[
              { id: "all", label: "All users" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
              { id: "suspended", label: "Suspended" }
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
            searchPlaceholder="Search users"
            searchValue={search}
          />
          <TenantUserList
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
            singularLabel="user"
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
        </>
      ) : (
        <WorkspaceShowCard title="Choose a tenant">
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Select a tenant above to load and manage users from its database.
          </p>
        </WorkspaceShowCard>
      )}
      <TenantUserForm
        {...(selectedTenant ? { contextLabel: selectedTenant.tenantName } : {})}
        {...(saveError instanceof Error ? { error: saveError.message } : {})}
        loading={mutations.create.isPending || mutations.update.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => void save(value)}
        open={canManage && editing !== undefined}
        record={editing ?? null}
      />
      <UserActionDialog
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
function UserActionDialog({
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
          <AlertDialogTitle>{verb} user?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.name ?? "This user"} will be permanently removed. Role assignments may block deletion.`
              : `${action?.record.name ?? "This user"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
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
