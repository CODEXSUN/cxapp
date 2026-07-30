import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { StateRecord } from "./state.types";

export function StateList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: StateRecord) => void;
  onForceDelete: (record: StateRecord) => void;
  onRestore: (record: StateRecord) => void;
  onSuspend: (record: StateRecord) => void;
  records: StateRecord[];
}) {
  const columns: ColumnDef<StateRecord>[] = [
    {
      accessorKey: "sortOrder",
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      header: () => <div className="text-center">#</div>,
      size: 64
    },
    {
      accessorKey: "name",
      cell: ({ row }) =>
        isProtectedState(row.original) ? (
          <span className="font-medium">{row.original.name}</span>
        ) : (
          <button
            className="cursor-pointer font-medium text-foreground hover:underline"
            onClick={() => onEdit(row.original)}
            type="button"
          >
            {row.original.name}
          </button>
        ),
      header: "State"
    },
    { accessorKey: "code", header: "State code" },
    { accessorKey: "countryName", header: "Country" },
    {
      accessorKey: "status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      ),
      header: "Status"
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      size: 96,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div
            className="flex w-full justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {isProtectedState(record) ? (
              <WorkspaceProtectedIndicator label="Protected state" />
            ) : (
              <WorkspaceRowActions
                actions={[
                  {
                    id: "force-delete",
                    icon: <Trash2 className="size-4" />,
                    label: "Force delete",
                    onSelect: () => onForceDelete(record),
                    tone: "destructive"
                  }
                ]}
                deleteLabel="Suspend"
                isSuspended={record.status === "inactive"}
                onDelete={() => onSuspend(record)}
                onEdit={() => onEdit(record)}
                onRestore={() => onRestore(record)}
                title={record.name}
              />
            )}
          </div>
        );
      }
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No states found."
      isLoading={loading}
      minWidth="860px"
    />
  );
}

export function isProtectedState(record: StateRecord) {
  return record.code.trim().toUpperCase() === "UNKNOWN" || record.name.trim() === "-";
}
