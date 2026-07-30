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
import { LedgerGroupsForm } from "./ledger-groups.form";
import { ledgerGroupsQueryKey, useLedgerGroups } from "./ledger-groups.hooks";
import { LedgerGroupsList } from "./ledger-groups.list";
import {
  activateLedgerGroup,
  createLedgerGroup,
  deactivateLedgerGroup,
  forceDeleteLedgerGroup,
  updateLedgerGroup
} from "./ledger-groups.services";
import type { LedgerGroupRecord, LedgerGroupSavePayload } from "./ledger-groups.types";
type Action = { record: LedgerGroupRecord; type: "delete" | "restore" | "suspend" };
export function LedgerGroupsWorkspace() {
  const client = useQueryClient();
  const query = useLedgerGroups();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<LedgerGroupRecord | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const save = useMutation({
    mutationFn: (payload: LedgerGroupSavePayload) =>
      editing ? updateLedgerGroup(editing.id, payload) : createLedgerGroup(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: ledgerGroupsQueryKey });
      toast.success(`Ledger group ${editing ? "updated" : "created"}`, {
        description: record.name
      });
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save ledger group", { description: message(error) })
  });
  const lifecycle = useMutation({
    mutationFn: ({ record, type }: Action) =>
      type === "delete"
        ? forceDeleteLedgerGroup(record.id)
        : type === "restore"
          ? activateLedgerGroup(record.id)
          : deactivateLedgerGroup(record.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ledgerGroupsQueryKey });
      toast.success("Ledger group updated");
      setAction(null);
    },
    onError: (error) =>
      toast.error("Unable to update ledger group", { description: message(error) })
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term || record.name.toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const current = Math.min(page, pages);
  const records = filtered.slice((current - 1) * rowsPerPage, current * rowsPerPage);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  return (
    <WorkspacePage
      title="Ledger Groups"
      description="Manage ledger groups available to the current tenant database."
      technicalName="page.common.accounts.ledger-groups.list"
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
            New ledger group
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All ledger groups" },
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
        searchPlaceholder="Search ledger groups"
        searchValue={search}
      />
      <LedgerGroupsList
        loading={query.isFetching && !query.data}
        records={records}
        onEdit={setEditing}
        onForceDelete={(record) => setAction({ record, type: "delete" })}
        onRestore={(record) => setAction({ record, type: "restore" })}
        onSuspend={(record) => setAction({ record, type: "suspend" })}
      />
      <WorkspacePagination
        page={current}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(current, rowsPerPage, filtered.length)}
        singularLabel="ledger group"
        totalCount={filtered.length}
        totalPages={pages}
        onNextPage={() => setPage((value) => Math.min(pages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <LedgerGroupsForm
        open={editing !== undefined}
        record={editing ?? null}
        loading={save.isPending}
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
      <Dialog
        action={action}
        loading={lifecycle.isPending}
        onCancel={() => setAction(null)}
        onConfirm={() => action && lifecycle.mutate(action)}
      />
    </WorkspacePage>
  );
}
function Dialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: Action | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const verb =
    action?.type === "restore" ? "Restore" : action?.type === "delete" ? "Force delete" : "Suspend";
  return (
    <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} ledger group?</AlertDialogTitle>
          <AlertDialogDescription>
            {action?.record.name} will be updated. Force deletion is blocked while ledgers reference
            it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={onConfirm}>
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
