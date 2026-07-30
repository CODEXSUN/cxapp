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
import { CountryForm } from "./country.form";
import { countryQueryKey, useCountries } from "./country.hooks";
import { CountryList } from "./country.list";
import {
  activateCountry,
  createCountry,
  deactivateCountry,
  forceDeleteCountry,
  updateCountry
} from "./country.services";
import type { CountryRecord, CountrySavePayload } from "./country.types";

type PendingAction = {
  record: CountryRecord;
  type: "force-delete" | "restore" | "suspend";
};

export function CountryWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<CountryRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const countriesQuery = useCountries();

  const saveMutation = useMutation({
    mutationFn: (payload: CountrySavePayload) =>
      editing ? updateCountry(editing.id, payload) : createCountry(payload),
    onError: showError("Unable to save country"),
    onSuccess: async (record) => {
      await refreshCountries(queryClient);
      toast.success(`Country ${editing ? "updated" : "created"}`, {
        description: `${record.name} is ready in the list.`
      });
      setEditing(undefined);
    }
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PendingAction) => {
      if (type === "force-delete") return forceDeleteCountry(record.id);
      if (type === "restore") return activateCountry(record.id);
      return deactivateCountry(record.id);
    },
    onError: showError("Unable to update country"),
    onSuccess: async (record, action) => {
      await refreshCountries(queryClient);
      toast.success(actionMessage(action.type), { description: record.name });
      setPendingAction(null);
    }
  });

  const filteredCountries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (countriesQuery.data ?? []).filter((record) => {
      const matchesStatus = status === "all" || record.status === status;
      const matchesSearch =
        !term ||
        record.name.toLowerCase().includes(term) ||
        record.code.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [countriesQuery.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filteredCountries.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageCountries = filteredCountries.slice(
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
            disabled={countriesQuery.isFetching}
            onClick={() => void countriesQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", countriesQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New country
          </Button>
        </div>
      }
      description="Manage countries available to the current tenant database."
      technicalName="page.common.location.country.list"
      title="Countries"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All countries" },
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
        searchPlaceholder="Search countries"
        searchValue={search}
      />
      <CountryList
        loading={countriesQuery.isFetching && !countriesQuery.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={pageCountries}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredCountries.length)}
        singularLabel="country"
        totalCount={filteredCountries.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <CountryForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <CountryActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}

function CountryActionDialog({
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
          <AlertDialogTitle>{verb} country?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.name ?? "This country"} will be permanently removed. This is blocked when states reference it.`
              : `${action?.record.name ?? "This country"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
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

function refreshCountries(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: countryQueryKey });
}

function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}

function actionMessage(type: PendingAction["type"]) {
  if (type === "force-delete") return "Country force deleted";
  return type === "restore" ? "Country restored" : "Country suspended";
}
