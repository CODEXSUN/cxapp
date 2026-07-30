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
import { StateForm } from "./state.form";
import { stateQueryKey, useStateCountryOptions, useStates } from "./state.hooks";
import { StateList } from "./state.list";
import {
  activateState,
  createState,
  deactivateState,
  forceDeleteState,
  updateState
} from "./state.services";
import type { StateRecord, StateSavePayload } from "./state.types";

type PendingAction = { record: StateRecord; type: "force-delete" | "restore" | "suspend" };

export function StateWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<StateRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const statesQuery = useStates();
  const countriesQuery = useStateCountryOptions();

  const saveMutation = useMutation({
    mutationFn: (payload: StateSavePayload) =>
      editing ? updateState(editing.id, payload) : createState(payload),
    onError: showError("Unable to save state"),
    onSuccess: async (record) => {
      await refreshStates(queryClient);
      toast.success(`State ${editing ? "updated" : "created"}`, {
        description: `${record.name} is ready in the list.`
      });
      setEditing(undefined);
    }
  });
  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PendingAction) =>
      type === "force-delete"
        ? forceDeleteState(record.id)
        : type === "restore"
          ? activateState(record.id)
          : deactivateState(record.id),
    onError: showError("Unable to update state"),
    onSuccess: async (record, action) => {
      await refreshStates(queryClient);
      toast.success(actionMessage(action.type), { description: record.name });
      setPendingAction(null);
    }
  });

  const filteredStates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (statesQuery.data ?? []).filter((record) => {
      const matchesStatus = status === "all" || record.status === status;
      const matchesSearch =
        !term ||
        record.name.toLowerCase().includes(term) ||
        record.code.toLowerCase().includes(term) ||
        record.countryName.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [search, statesQuery.data, status]);
  const totalPages = Math.max(1, Math.ceil(filteredStates.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStates = filteredStates.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={statesQuery.isFetching}
            onClick={() => void statesQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", statesQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New state
          </Button>
        </div>
      }
      description="Manage states and their owning countries in the current tenant database."
      technicalName="page.common.location.state.list"
      title="States"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All states" },
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
        searchPlaceholder="Search states"
        searchValue={search}
      />
      <StateList
        loading={statesQuery.isFetching && !statesQuery.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={pageStates}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredStates.length)}
        singularLabel="state"
        totalCount={filteredStates.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <StateForm
        countries={countriesQuery.data ?? []}
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <StateActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}

function StateActionDialog({
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
          <AlertDialogTitle>{verb} state?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.name ?? "This state"} will be permanently removed. This is blocked when districts reference it.`
              : `${action?.record.name ?? "This state"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              action?.type === "force-delete"
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

function refreshStates(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: stateQueryKey });
}
function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}
function actionMessage(type: PendingAction["type"]) {
  if (type === "force-delete") return "State force deleted";
  return type === "restore" ? "State restored" : "State suspended";
}
