import { StatusBadge } from "@codexsun/ui";
import type { TenantAccessSummary } from "./tenant-access.types";

export function TenantAccessList({ records }: { records: TenantAccessSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Tenant</th>
            <th className="px-4 py-3 text-left font-semibold">Subscription</th>
            <th className="px-4 py-3 text-left font-semibold">Plan access</th>
            <th className="px-4 py-3 text-left font-semibold">Manual access</th>
            <th className="px-4 py-3 text-left font-semibold">Final access</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr className="border-t align-top" key={record.uuid}>
              <td className="px-4 py-3">
                <div className="font-medium">{record.tenantName}</div>
                <div className="text-xs text-muted-foreground">{record.tenantCode}</div>
              </td>
              <td className="px-4 py-3">
                {record.activeSubscription ? (
                  <div className="space-y-1">
                    <div>{record.activeSubscription.planName}</div>
                    <StatusBadge
                      tone={record.activeSubscription.status === "active" ? "green" : "blue"}
                    >
                      {record.activeSubscription.status}
                    </StatusBadge>
                  </div>
                ) : (
                  <StatusBadge tone="amber">No active plan</StatusBadge>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {record.planModuleKeys.join(", ") || "-"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {record.manualModuleKeys.join(", ") || "-"}
              </td>
              <td className="px-4 py-3 font-medium">
                {record.enabledModuleKeys.join(", ") || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No tenant access records found.
        </div>
      ) : null}
    </div>
  );
}
