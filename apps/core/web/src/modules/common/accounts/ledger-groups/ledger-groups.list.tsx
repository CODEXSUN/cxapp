import { Trash2 } from "lucide-react";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceProtectedIndicator } from "@cxapp/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@cxapp/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import { WorkspaceTable } from "@cxapp/ui/workspace/table";
import type { LedgerGroupRecord } from "./ledger-groups.types";
export function LedgerGroupsList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: LedgerGroupRecord) => void;
  onForceDelete: (record: LedgerGroupRecord) => void;
  onRestore: (record: LedgerGroupRecord) => void;
  onSuspend: (record: LedgerGroupRecord) => void;
  records: LedgerGroupRecord[];
}) {
  const columns: ColumnDef<LedgerGroupRecord>[] = [
    {
      accessorKey: "id",
      header: () => <div className="text-center">#</div>,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.id}</div>,
      size: 64
    },
    {
      accessorKey: "name",
      header: "Ledger group",
      cell: ({ row }) =>
        protectedRecord(row.original) ? (
          <span className="font-medium">{row.original.name}</span>
        ) : (
          <button
            className="cursor-pointer font-medium hover:underline"
            onClick={() => onEdit(row.original)}
            type="button"
          >
            {row.original.name}
          </button>
        )
    },
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
            <WorkspaceProtectedIndicator label="Protected ledger group" />
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
      emptyState="No ledger groups found."
      isLoading={loading}
      minWidth="720px"
    />
  );
}
function protectedRecord(record: LedgerGroupRecord) {
  return ["-", "general"].includes(record.name.trim().toLowerCase());
}
