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
  AlertDialogTitle,
  Button,
  WorkspaceFilters,
  WorkspacePage,
  WorkspacePagination
} from "@codexsun/ui";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { FinancialYearForm } from "./financial-year.form";
import { financialYearsQueryKey, useFinancialYears } from "./financial-year.hooks";
import { FinancialYearList } from "./financial-year.list";
import {
  activateFinancialYear,
  createFinancialYear,
  deactivateFinancialYear,
  forceDeleteFinancialYear,
  setCurrentFinancialYear,
  updateFinancialYear
} from "./financial-year.services";
import type { FinancialYearRecord, FinancialYearSavePayload } from "./financial-year.types";
type Action = { record: FinancialYearRecord; type: "current" | "delete" | "restore" | "suspend" };
export function FinancialYearWorkspace() {
  const client = useQueryClient();
  const query = useFinancialYears();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState<FinancialYearRecord | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const save = useMutation({
    mutationFn: (payload: FinancialYearSavePayload) =>
      editing ? updateFinancialYear(editing.id, payload) : createFinancialYear(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: financialYearsQueryKey });
      toast.success(`Financial year ${editing ? "updated" : "created"}`, {
        description: record.name
      });
      setEditing(undefined);
    },
    onError: (error) =>
      toast.error("Unable to save financial year", { description: message(error) })
  });
  const lifecycle = useMutation({
    mutationFn: ({ record, type }: Action) =>
      type === "current"
        ? setCurrentFinancialYear(record.id)
        : type === "delete"
          ? forceDeleteFinancialYear(record.id)
          : type === "restore"
            ? activateFinancialYear(record.id)
            : deactivateFinancialYear(record.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: financialYearsQueryKey });
      toast.success("Financial year updated");
      setAction(null);
    },
    onError: (error) =>
      toast.error("Unable to update financial year", { description: message(error) })
  });
  const records = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          [record.name, record.startDate, record.endDate, record.status].some((value) =>
            value.toLowerCase().includes(term)
          ))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(records.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = records.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  return (
    <WorkspacePage
      title="Financial Years"
      description="Accounting periods shared across tenant applications and daily transactions."
      technicalName="page.organisation.financial-years.list"
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
            New financial year
          </Button>
        </div>
      }
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
        searchPlaceholder="Search name, start date, or status"
        searchValue={search}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      <FinancialYearList
        loading={query.isFetching && !query.data}
        records={visibleRecords}
        onEdit={setEditing}
        onCurrent={(record) => setAction({ record, type: "current" })}
        onForceDelete={(record) => setAction({ record, type: "delete" })}
        onRestore={(record) => setAction({ record, type: "restore" })}
        onSuspend={(record) => setAction({ record, type: "suspend" })}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, records.length)}
        singularLabel="financial year"
        totalCount={records.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <FinancialYearForm
        open={editing !== undefined}
        record={editing ?? null}
        loading={save.isPending}
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
      <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTitle(action)}</AlertDialogTitle>
            <AlertDialogDescription>
              {action?.record.name} will be updated for the whole tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={lifecycle.isPending}
              onClick={() => action && lifecycle.mutate(action)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
function actionTitle(action: Action | null) {
  if (action?.type === "current") return "Set as current financial year?";
  if (action?.type === "delete") return "Force delete financial year?";
  if (action?.type === "restore") return "Restore financial year?";
  return "Suspend financial year?";
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
