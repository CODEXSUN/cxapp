import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { LedgerRecord } from "./ledgers.types";
export function LedgersList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: LedgerRecord) => void;
  onForceDelete: (record: LedgerRecord) => void;
  onRestore: (record: LedgerRecord) => void;
  onSuspend: (record: LedgerRecord) => void;
  records: LedgerRecord[];
}) {
  const columns: ColumnDef<LedgerRecord>[] = [
    {
      accessorKey: "id",
      header: () => <div className="text-center">#</div>,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.id}</div>,
      size: 64
    },
    {
      accessorKey: "name",
      header: "Ledger",
      cell: ({ row }) =>
        protectedRecord(row.original) ? (
          <span className="font-medium">{row.original.name}</span>
        ) : (
          <button
            className="cursor-pointer font-medium hover:underline"
            type="button"
            onClick={() => onEdit(row.original)}
          >
            {row.original.name}
          </button>
        )
    },
    { accessorKey: "ledgerGroupName", header: "Ledger group" },
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
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
          {protectedRecord(row.original) ? (
            <WorkspaceProtectedIndicator label="Protected ledger" />
          ) : (
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
              isSuspended={row.original.status === "inactive"}
              onDelete={() => onSuspend(row.original)}
              onEdit={() => onEdit(row.original)}
              onRestore={() => onRestore(row.original)}
              title={row.original.name}
            />
          )}
        </div>
      ),
      size: 96
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No ledgers found."
      isLoading={loading}
      minWidth="800px"
    />
  );
}
function protectedRecord(record: LedgerRecord) {
  return ["-", "general ledger"].includes(record.name.trim().toLowerCase());
}
