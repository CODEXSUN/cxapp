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
import { CityForm } from "./city.form";
import { cityQueryKey, useCitys, useCityDistrictOptions } from "./city.hooks";
import { CityList } from "./city.list";
import {
  activateCity,
  createCity,
  deactivateCity,
  forceDeleteCity,
  updateCity
} from "./city.services";
import type { CityRecord, CitySavePayload } from "./city.types";
type Action = { record: CityRecord; type: "force-delete" | "restore" | "suspend" };
export function CityWorkspace() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(100);
  const [editing, setEditing] = useState<CityRecord | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const query = useCitys();
  const options = useCityDistrictOptions();
  const save = useMutation({
    mutationFn: (value: CitySavePayload) =>
      editing ? updateCity(editing.id, value) : createCity(value),
    onError: showError("Unable to save city"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: cityQueryKey });
      toast.success(`City ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
    }
  });
  const lifecycle = useMutation({
    mutationFn: ({ record, type }: Action) =>
      type === "force-delete"
        ? forceDeleteCity(record.id)
        : type === "restore"
          ? activateCity(record.id)
          : deactivateCity(record.id),
    onError: showError("Unable to update city"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: cityQueryKey });
      toast.success("City updated", { description: record.name });
      setAction(null);
    }
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((record) => {
      return (
        (status === "all" || record.status === status) &&
        (!term ||
          Object.values(record).some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(term)
          ))
      );
    });
  }, [query.data, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    rows = filtered.slice((current - 1) * size, current * size);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  return (
    <WorkspacePage
      title="Cities"
      description="Manage cities in the current tenant database."
      technicalName="page.common.location.city.list"
      actions={
        <div className="flex gap-2">
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New city
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All cities" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
        filterValue={status}
        onFilterValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onSearchValueChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search cities"
        searchValue={search}
      />
      <CityList
        loading={query.isFetching && !query.data}
        onEdit={setEditing}
        onForceDelete={(record) => setAction({ record, type: "force-delete" })}
        onRestore={(record) => setAction({ record, type: "restore" })}
        onSuspend={(record) => setAction({ record, type: "suspend" })}
        records={rows}
      />
      <WorkspacePagination
        page={current}
        rowsPerPage={size}
        showingLabel={buildShowingLabel(current, size, filtered.length)}
        singularLabel="city"
        totalCount={filtered.length}
        totalPages={pages}
        onNextPage={() => setPage((v) => Math.min(pages, v + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((v) => Math.max(1, v - 1))}
        onRowsPerPageChange={(v) => {
          setSize(v);
          setPage(1);
        }}
      />
      <CityForm
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        loading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => save.mutate(value)}
        open={editing !== undefined}
        options={options.data ?? []}
        record={editing ?? null}
      />
      <ActionDialog
        action={action}
        loading={lifecycle.isPending}
        onCancel={() => setAction(null)}
        onConfirm={() => action && lifecycle.mutate(action)}
      />
    </WorkspacePage>
  );
}
function ActionDialog({
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
    action?.type === "restore"
      ? "Restore"
      : action?.type === "force-delete"
        ? "Force delete"
        : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} city?</AlertDialogTitle>
          <AlertDialogDescription>{action?.record.name ?? "Selected city"}</AlertDialogDescription>
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
function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}
