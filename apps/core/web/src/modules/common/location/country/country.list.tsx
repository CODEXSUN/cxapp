import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { CountryRecord } from "./country.types";

export function CountryList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: CountryRecord) => void;
  onForceDelete: (record: CountryRecord) => void;
  onRestore: (record: CountryRecord) => void;
  onSuspend: (record: CountryRecord) => void;
  records: CountryRecord[];
}) {
  const columns: ColumnDef<CountryRecord>[] = [
    {
      accessorKey: "sortOrder",
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      header: () => <div className="text-center">#</div>,
      size: 64
    },
    {
      accessorKey: "name",
      cell: ({ row }) =>
        isProtectedCountry(row.original) ? (
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
      header: "Country"
    },
    { accessorKey: "code", header: "Country code" },
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
      cell: ({ row }) => {
        const record = row.original;
        const protectedRecord = isProtectedCountry(record);
        return (
          <div
            className="flex w-full justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {protectedRecord ? (
              <WorkspaceProtectedIndicator label="Protected country" />
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
      },
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      size: 96,
      id: "actions"
    }
  ];

  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No countries found."
      isLoading={loading}
      minWidth="760px"
    />
  );
}

export function isProtectedCountry(record: CountryRecord) {
  return record.code.trim().toUpperCase() === "IN" || record.name.trim().toLowerCase() === "india";
}
