import { Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTable } from "@codexsun/ui/workspace/table";
import type { TenantRolePermission } from "./tenant-role-permission.types";
export function TenantRolePermissionList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: TenantRolePermission) => void;
  onForceDelete: (record: TenantRolePermission) => void;
  onRestore: (record: TenantRolePermission) => void;
  onSuspend: (record: TenantRolePermission) => void;
  records: TenantRolePermission[];
}) {
  const columns: ColumnDef<TenantRolePermission>[] = [
    {
      cell: ({ row }) => <div className="text-center tabular-nums">{row.index + 1}</div>,
      header: () => <div className="text-center">#</div>,
      id: "number",
      size: 64
    },
    {
      accessorKey: "roleLabel",
      cell: ({ row }) =>
        row.original.isProtected ? (
          <span className="font-medium">{row.original.roleLabel}</span>
        ) : (
          <button
            className="cursor-pointer font-medium text-foreground hover:underline"
            onClick={() => onEdit(row.original)}
            type="button"
          >
            {row.original.roleLabel}
          </button>
        ),
      header: "Role"
    },
    { accessorKey: "permissionLabel", header: "Permission" },
    { accessorKey: "permissionKey", header: "Permission key" },
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
      emptyState="No role permissions found."
      isLoading={loading}
      minWidth="900px"
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
  onEdit: (record: TenantRolePermission) => void;
  onForceDelete: (record: TenantRolePermission) => void;
  onRestore: (record: TenantRolePermission) => void;
  onSuspend: (record: TenantRolePermission) => void;
  record: TenantRolePermission;
}) {
  return (
    <div
      className="flex w-full justify-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {record.isProtected ? (
        <WorkspaceProtectedIndicator label="Protected role permission" />
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
          title={`${record.roleLabel} · ${record.permissionLabel}`}
        />
      )}
    </div>
  );
}
