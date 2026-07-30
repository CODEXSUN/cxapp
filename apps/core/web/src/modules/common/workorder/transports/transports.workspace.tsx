import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { TransportsForm } from "./transports.form";
import { transportsQueryKey, useTransports } from "./transports.hooks";
import { TransportsList } from "./transports.list";
import {
  activateTransports,
  createTransports,
  deactivateTransports,
  forceDeleteTransports,
  updateTransports
} from "./transports.services";
import type { TransportsRecord, TransportsSavePayload } from "./transports.types";
type PendingAction = { record: TransportsRecord; type: "force-delete" | "restore" | "suspend" };

export function TransportsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<TransportsRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const query = useTransports();
  const saveMutation = useMutation({
    mutationFn: (payload: TransportsSavePayload) =>
      editing ? updateTransports(editing.id, payload) : createTransports(payload),
    onError: showError("Unable to save transport"),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: transportsQueryKey });
      toast.success(`Transport ${editing ? "updated" : "created"}`, {
        description: String(record.name)
      });
      setEditing(undefined);
    }
  });
  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PendingAction) =>
      type === "force-delete"
        ? forceDeleteTransports(record.id)
        : type === "restore"
          ? activateTransports(record.id)
          : deactivateTransports(record.id),
    onError: showError("Unable to update transport"),
    onSuccess: async (record, action) => {
      await queryClient.invalidateQueries({ queryKey: transportsQueryKey });
      toast.success(
        action.type === "force-delete"
          ? "Transport force deleted"
          : action.type === "restore"
            ? "Transport restored"
            : "Transport suspended",
        { description: String(record.name) }
      );
      setPendingAction(null);
    }
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || (status === "active" ? record.isActive : !record.isActive)) &&
        (!term ||
          String(record.name).toLowerCase().includes(term) ||
          String(record.gst).toLowerCase().includes(term) ||
          String(record.vehicleNo).toLowerCase().includes(term) ||
          String(record.address).toLowerCase().includes(term) ||
          String(record.contactNo).toLowerCase().includes(term) ||
          String(record.contactPerson).toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
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
            New transport
          </Button>
        </div>
      }
      description="Manage transports for the current tenant database."
      technicalName="page.common.workorder.transports.list"
      title="Transports"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All records" },
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
        searchPlaceholder="Search transports"
        searchValue={search}
      />
      <TransportsList
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
        singularLabel="transport"
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
      <TransportsForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <TransportsActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}
function TransportsActionDialog({
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
          <AlertDialogTitle>{verb} transport?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${String(action?.record.name ?? "This record")} will be permanently removed.`
              : `${String(action?.record.name ?? "This record")} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
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
function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}
