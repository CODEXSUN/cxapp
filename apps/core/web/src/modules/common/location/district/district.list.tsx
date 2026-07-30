import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { DistrictRecord } from "./district.types";
export function DistrictList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (r: DistrictRecord) => void;
  onForceDelete: (r: DistrictRecord) => void;
  onRestore: (r: DistrictRecord) => void;
  onSuspend: (r: DistrictRecord) => void;
  records: DistrictRecord[];
}) {
  const columns: ColumnDef<DistrictRecord>[] = [
    {
      accessorKey: "sortOrder",
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      header: () => <div className="text-center">#</div>,
      size: 64
    },
    {
      accessorKey: "name",
      cell: ({ row }) =>
        isProtectedDistrict(row.original) ? (
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
      header: "District"
    },
    { accessorKey: "stateName", header: "State" },
    { accessorKey: "countryName", header: "Country" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      )
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      size: 96,
      enableSorting: false,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div
            className="flex w-full justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {isProtectedDistrict(record) ? (
              <WorkspaceProtectedIndicator label="Protected district" />
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
      emptyState="No districts found."
      isLoading={loading}
      minWidth="860px"
    />
  );
}
export function isProtectedDistrict(record: DistrictRecord) {
  return record.name.trim() === "-";
}
