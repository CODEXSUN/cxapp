import { Trash2 } from "lucide-react";
import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@codexsun/ui/workspace/table";
import type { WorkOrderRecord } from "./work-order.types";

export function WorkOrderList({
  loading,
  onEdit,
  onForceDelete,
  onToggle,
  records,
  visibleColumns
}: {
  loading: boolean;
  onEdit: (record: WorkOrderRecord) => void;
  onForceDelete: (record: WorkOrderRecord) => void;
  onToggle: (record: WorkOrderRecord) => void;
  records: WorkOrderRecord[];
  visibleColumns?: Record<string, boolean>;
}) {
  const columns = workOrderColumns.filter((column) => visibleColumns?.[column.id] ?? true);

  return (
    <WorkspaceTablePanel>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <WorkspaceTableHeaderCell key={column.id}>{column.label}</WorkspaceTableHeaderCell>
              ))}
              <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {!loading
              ? records.map((record) => {
                  const protectedRow = isProtectedWorkOrder(record);
                  return (
                    <tr key={record.id} className="border-b last:border-0">
                      {columns.map((column) => (
                        <WorkOrderCell
                          columnId={column.id}
                          key={column.id}
                          protectedRow={protectedRow}
                          record={record}
                          onEdit={onEdit}
                        />
                      ))}
                      <td className="px-4 py-3 text-right">
                        {protectedRow ? (
                          <WorkspaceProtectedIndicator />
                        ) : (
                          <WorkOrderRowActions
                            record={record}
                            onEdit={onEdit}
                            onForceDelete={onForceDelete}
                            onToggle={onToggle}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
      {!loading && records.length ? (
        <div className="divide-y divide-border/70 md:hidden">
          {records.map((record) => {
            const protectedRow = isProtectedWorkOrder(record);
            return (
              <article className="px-4 py-4" key={record.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      <WorkOrderEditLink
                        editable={!protectedRow}
                        value={record.name}
                        onEdit={() => onEdit(record)}
                      />
                    </h3>
                    <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">
                      <WorkOrderEditLink
                        editable={!protectedRow}
                        value={record.code}
                        onEdit={() => onEdit(record)}
                      />
                    </p>
                  </div>
                  {protectedRow ? (
                    <WorkspaceProtectedIndicator />
                  ) : (
                    <WorkOrderRowActions
                      record={record}
                      onEdit={onEdit}
                      onForceDelete={onForceDelete}
                      onToggle={onToggle}
                    />
                  )}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground"></div>
                <div className="mt-3">
                  <WorkspaceStatusBadge
                    label={record.isActive ? "active" : "inactive"}
                    tone={record.isActive ? "success" : "warning"}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {loading && !records.length ? <WorkspaceTableLoadingState /> : null}
      {!loading && !records.length ? (
        <WorkspaceTableEmptyState>No work orders found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

export const workOrderColumns = [
  { id: "name", label: "Work Order" },
  { id: "code", label: "Code" },
  { id: "status", label: "Status" }
];

export function isProtectedWorkOrder(record: WorkOrderRecord) {
  return record.name.trim() === "-";
}

function WorkOrderEditLink({
  editable,
  onEdit,
  value
}: {
  editable: boolean;
  onEdit: () => void;
  value: unknown;
}) {
  if (!editable) return <span>{String(value || "-")}</span>;
  return (
    <button
      className="max-w-full cursor-pointer truncate text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onEdit}
      type="button"
    >
      {String(value || "-")}
    </button>
  );
}

function WorkOrderCell({
  columnId,
  onEdit,
  protectedRow,
  record
}: {
  columnId: string;
  onEdit: (record: WorkOrderRecord) => void;
  protectedRow: boolean;
  record: WorkOrderRecord;
}) {
  if (columnId === "name") {
    return (
      <td className="px-4 py-3">
        <WorkOrderEditLink
          editable={!protectedRow}
          value={record.name}
          onEdit={() => onEdit(record)}
        />
      </td>
    );
  }
  if (columnId === "code") {
    return (
      <td className="px-4 py-3 uppercase text-muted-foreground">
        <WorkOrderEditLink
          editable={!protectedRow}
          value={record.code}
          onEdit={() => onEdit(record)}
        />
      </td>
    );
  }
  return (
    <td className="px-4 py-3">
      <WorkspaceStatusBadge
        label={record.isActive ? "active" : "inactive"}
        tone={record.isActive ? "success" : "warning"}
      />
    </td>
  );
}

function WorkOrderRowActions({
  onEdit,
  onForceDelete,
  onToggle,
  record
}: {
  onEdit: (record: WorkOrderRecord) => void;
  onForceDelete: (record: WorkOrderRecord) => void;
  onToggle: (record: WorkOrderRecord) => void;
  record: WorkOrderRecord;
}) {
  return (
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
      isSuspended={!record.isActive}
      onDelete={() => onToggle(record)}
      onEdit={() => onEdit(record)}
      onRestore={() => onToggle(record)}
      restoreLabel="Activate"
      title={record.name}
    />
  );
}
