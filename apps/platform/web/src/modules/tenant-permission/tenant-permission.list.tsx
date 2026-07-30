import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { TenantPermission } from "./tenant-permission.types";
export function TenantPermissionList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: TenantPermission) => void;
  onForceDelete: (record: TenantPermission) => void;
  onRestore: (record: TenantPermission) => void;
  onSuspend: (record: TenantPermission) => void;
  records: TenantPermission[];
}) {
  const columns: ColumnDef<TenantPermission>[] = [
    {
      cell: ({ row }) => <div className="text-center tabular-nums">{row.index + 1}</div>,
      header: () => <div className="text-center">#</div>,
      id: "number",
      size: 64
    },
    {
      accessorKey: "label",
      cell: ({ row }) =>
        row.original.isProtected ? (
          <span className="font-medium">{row.original.label}</span>
        ) : (
          <button
            className="cursor-pointer font-medium text-foreground hover:underline"
            onClick={() => onEdit(row.original)}
            type="button"
          >
            {row.original.label}
          </button>
        ),
      header: "Permission"
    },
    { accessorKey: "key", header: "Permission key" },
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
      cell: ({ row }) => (
        <Actions
          record={row.original}
          onEdit={onEdit}
          onForceDelete={onForceDelete}
          onRestore={onRestore}
          onSuspend={onSuspend}
        />
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
      emptyState="No permissions found."
      isLoading={loading}
      minWidth="800px"
    />
  );
}
function Actions({
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  record
}: {
  onEdit: (record: TenantPermission) => void;
  onForceDelete: (record: TenantPermission) => void;
  onRestore: (record: TenantPermission) => void;
  onSuspend: (record: TenantPermission) => void;
  record: TenantPermission;
}) {
  return (
    <div
      className="flex w-full justify-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {record.isProtected ? (
        <WorkspaceProtectedIndicator label="Protected permission" />
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
          title={record.label}
        />
      )}
    </div>
  );
}
