import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { TaxesRecord } from "./taxes.types";

export function TaxesList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: TaxesRecord) => void;
  onForceDelete: (record: TaxesRecord) => void;
  onRestore: (record: TaxesRecord) => void;
  onSuspend: (record: TaxesRecord) => void;
  records: TaxesRecord[];
}) {
  const columns: ColumnDef<TaxesRecord>[] = [
    {
      accessorKey: "sortOrder",
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      header: () => <div className="text-center">#</div>,
      size: 64
    },
    {
      accessorKey: "ratePercent",
      cell: ({ row }) => (
        <button
          className="cursor-pointer font-medium text-foreground hover:underline"
          onClick={() => onEdit(row.original)}
          type="button"
        >
          {String(row.original.ratePercent)}
        </button>
      ),
      header: "Rate percent"
    },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "isActive",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.isActive ? "Active" : "Inactive"}
          tone={row.original.isActive ? "success" : "neutral"}
        />
      ),
      header: "Status"
    },
    {
      cell: ({ row }) => (
        <div
          className="flex w-full justify-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <WorkspaceRowActions
            actions={[
              {
                id: "force-delete",
                icon: <Trash2 className="size-4" />,
                label: "Force delete",
                onSelect: () => onForceDelete(row.original),
                tone: "destructive"
              }
            ]}
            deleteLabel="Suspend"
            isSuspended={!row.original.isActive}
            onDelete={() => onSuspend(row.original)}
            onEdit={() => onEdit(row.original)}
            onRestore={() => onRestore(row.original)}
            title={String(row.original.ratePercent)}
          />
        </div>
      ),
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      id: "actions",
      size: 96
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No taxes found."
      isLoading={loading}
      minWidth="760px"
    />
  );
}
