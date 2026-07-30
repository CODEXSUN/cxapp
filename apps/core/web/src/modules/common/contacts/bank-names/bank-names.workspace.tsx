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
import { BankNamesForm } from "./bank-names.form";
import { bankNamesQueryKey, useBankNames } from "./bank-names.hooks";
import { BankNamesList } from "./bank-names.list";
import {
  activateBankNames,
  createBankNames,
  deactivateBankNames,
  forceDeleteBankNames,
  updateBankNames
} from "./bank-names.services";
import type { BankNamesRecord, BankNamesSavePayload } from "./bank-names.types";
type PendingAction = { record: BankNamesRecord; type: "force-delete" | "restore" | "suspend" };

export function BankNamesWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<BankNamesRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const query = useBankNames();
  const saveMutation = useMutation({
    mutationFn: (payload: BankNamesSavePayload) =>
      editing ? updateBankNames(editing.id, payload) : createBankNames(payload),
    onError: showError("Unable to save bank name"),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: bankNamesQueryKey });
      toast.success(`Bank name ${editing ? "updated" : "created"}`, {
        description: String(record.name)
      });
      setEditing(undefined);
    }
  });
  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PendingAction) =>
      type === "force-delete"
        ? forceDeleteBankNames(record.id)
        : type === "restore"
          ? activateBankNames(record.id)
          : deactivateBankNames(record.id),
    onError: showError("Unable to update bank name"),
    onSuccess: async (record, action) => {
      await queryClient.invalidateQueries({ queryKey: bankNamesQueryKey });
      toast.success(
        action.type === "force-delete"
          ? "Bank name force deleted"
          : action.type === "restore"
            ? "Bank name restored"
            : "Bank name suspended",
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
        (!term || String(record.name).toLowerCase().includes(term))
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
            New bank name
          </Button>
        </div>
      }
      description="Manage bank names for the current tenant database."
      technicalName="page.common.contacts.bank-names.list"
      title="Bank Names"
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
        searchPlaceholder="Search bank names"
        searchValue={search}
      />
      <BankNamesList
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
        singularLabel="bank name"
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
      <BankNamesForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <BankNamesActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}
function BankNamesActionDialog({
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
          <AlertDialogTitle>{verb} bank name?</AlertDialogTitle>
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
