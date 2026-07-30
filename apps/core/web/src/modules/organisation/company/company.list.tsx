import { WorkspaceProtectedIndicator } from "@codexsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@codexsun/ui/workspace/table";
import type { CompanyRecord } from "./company.types";
export function CompanyList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: CompanyRecord) => void;
  onForceDelete: (record: CompanyRecord) => void;
  onRestore: (record: CompanyRecord) => void;
  onSuspend: (record: CompanyRecord) => void;
  records: CompanyRecord[];
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr>
              {["Company", "Code", "Industry", "Phone", "Status"].map((label) => (
                <WorkspaceTableHeaderCell key={label}>{label}</WorkspaceTableHeaderCell>
              ))}
              <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const locked = record.name.trim() === "-";
              return (
                <tr className="border-b last:border-0" key={record.id}>
                  <td className="px-4 py-3">
                    <button
                      className="font-medium hover:underline"
                      disabled={locked}
                      onClick={() => onEdit(record)}
                    >
                      {record.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">{record.code}</td>
                  <td className="px-4 py-3">{record.industryName || "-"}</td>
                  <td className="px-4 py-3">{record.primaryPhone || "-"}</td>
                  <td className="px-4 py-3">
                    <WorkspaceStatusBadge
                      label={record.isActive ? "active" : "inactive"}
                      tone={record.isActive ? "success" : "warning"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {locked ? (
                      <WorkspaceProtectedIndicator />
                    ) : (
                      <WorkspaceRowActions
                        actions={[
                          {
                            id: "force-delete",
                            label: "Force delete",
                            onSelect: () => onForceDelete(record),
                            tone: "destructive"
                          }
                        ]}
                        deleteLabel="Suspend"
                        isSuspended={!record.isActive}
                        onDelete={() => onSuspend(record)}
                        onEdit={() => onEdit(record)}
                        onRestore={() => onRestore(record)}
                        title={record.name}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && !records.length ? <WorkspaceTableLoadingState /> : null}
      {!loading && !records.length ? (
        <WorkspaceTableEmptyState>No companies found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
