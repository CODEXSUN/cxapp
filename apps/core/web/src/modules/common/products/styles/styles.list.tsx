import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { StylesRecord } from "./styles.types";

export function StylesList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: StylesRecord) => void;
  onForceDelete: (record: StylesRecord) => void;
  onRestore: (record: StylesRecord) => void;
  onSuspend: (record: StylesRecord) => void;
  records: StylesRecord[];
}) {
  const columns: ColumnDef<StylesRecord>[] = [
    {
      accessorKey: "sortOrder",
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      header: () => <div className="text-center">#</div>,
      size: 64
    },
    {
      accessorKey: "name",
      cell: ({ row }) => (
        <button
          className="cursor-pointer font-medium text-foreground hover:underline"
          onClick={() => onEdit(row.original)}
          type="button"
        >
          {String(row.original.name)}
        </button>
      ),
      header: "Name"
    },
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
            title={String(row.original.name)}
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
      emptyState="No styles found."
      isLoading={loading}
      minWidth="760px"
    />
  );
}
