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
import { PincodeForm } from "./pincode.form";
import { pincodeQueryKey, usePincodes, usePincodeCityOptions } from "./pincode.hooks";
import { PincodeList } from "./pincode.list";
import {
  activatePincode,
  createPincode,
  deactivatePincode,
  forceDeletePincode,
  updatePincode
} from "./pincode.services";
import type { PincodeRecord, PincodeSavePayload } from "./pincode.types";
type Action = { record: PincodeRecord; type: "force-delete" | "restore" | "suspend" };
export function PincodeWorkspace() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(100);
  const [editing, setEditing] = useState<PincodeRecord | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const query = usePincodes();
  const options = usePincodeCityOptions();
  const save = useMutation({
    mutationFn: (value: PincodeSavePayload) =>
      editing ? updatePincode(editing.id, value) : createPincode(value),
    onError: showError("Unable to save pincode"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: pincodeQueryKey });
      toast.success(`Pincode ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
    }
  });
  const lifecycle = useMutation({
    mutationFn: ({ record, type }: Action) =>
      type === "force-delete"
        ? forceDeletePincode(record.id)
        : type === "restore"
          ? activatePincode(record.id)
          : deactivatePincode(record.id),
    onError: showError("Unable to update pincode"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: pincodeQueryKey });
      toast.success("Pincode updated", { description: record.name });
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
      title="Pincodes"
      description="Manage pincodes in the current tenant database."
      technicalName="page.common.location.pincode.list"
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
            New pincode
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All pincodes" },
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
        searchPlaceholder="Search pincodes"
        searchValue={search}
      />
      <PincodeList
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
        singularLabel="pincode"
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
      <PincodeForm
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
          <AlertDialogTitle>{verb} pincode?</AlertDialogTitle>
          <AlertDialogDescription>
            {action?.record.name ?? "Selected pincode"}
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
function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}
