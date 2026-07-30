import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Trash2 } from "lucide-react";
import { WorkspaceRowActions, WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { FinancialYearRecord } from "./financial-year.types";
export function FinancialYearList({
  loading,
  onCurrent,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onCurrent: (record: FinancialYearRecord) => void;
  onEdit: (record: FinancialYearRecord) => void;
  onForceDelete: (record: FinancialYearRecord) => void;
  onRestore: (record: FinancialYearRecord) => void;
  onSuspend: (record: FinancialYearRecord) => void;
  records: FinancialYearRecord[];
}) {
  const columns: ColumnDef<FinancialYearRecord>[] = [
    { accessorKey: "id", header: "#", size: 60 },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <button
          className="font-medium hover:underline"
          type="button"
          onClick={() => onEdit(row.original)}
        >
          {row.original.name}
        </button>
      )
    },
    {
      accessorKey: "startDate",
      header: "Start date",
      cell: ({ row }) => formatDate(row.original.startDate)
    },
    {
      accessorKey: "endDate",
      header: "End date",
      cell: ({ row }) => formatDate(row.original.endDate)
    },
    {
      id: "current",
      header: "Current year",
      cell: ({ row }) =>
        row.original.isCurrent ? <WorkspaceStatusBadge label="Current" tone="info" /> : "-"
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      )
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatDateTime(row.original.updatedAt)
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
          <WorkspaceRowActions
            actions={[
              ...(!row.original.isCurrent && row.original.status === "active"
                ? [
                    {
                      id: "current",
                      icon: <CheckCircle2 className="size-4" />,
                      label: "Set current",
                      onSelect: () => onCurrent(row.original)
                    }
                  ]
                : []),
              {
                id: "force-delete",
                icon: <Trash2 className="size-4" />,
                label: "Force delete",
                onSelect: () => onForceDelete(row.original),
                tone: "destructive" as const
              }
            ]}
            deleteLabel="Suspend"
            isSuspended={row.original.status !== "active"}
            onDelete={() => onSuspend(row.original)}
            onEdit={() => onEdit(row.original)}
            onRestore={() => onRestore(row.original)}
            title={row.original.name}
          />
        </div>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No financial years found."
      isLoading={loading}
      minWidth="980px"
    />
  );
}
function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
        date
      );
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
        date
      );
}
