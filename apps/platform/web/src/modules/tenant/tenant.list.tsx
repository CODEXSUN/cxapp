import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { Tenant } from "./tenant.types";

export function TenantTable({
  onSelect,
  tenants
}: {
  onSelect: (tenant: Tenant) => void;
  tenants: Tenant[];
}) {
  return (
    <WorkspaceTablePanel>
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <WorkspaceTableHeaderCell>Tenant</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>UUID</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Domain</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr className="border-b border-border/70 last:border-b-0" key={tenant.id}>
              <td className="px-4 py-2.5">
                <button
                  className="font-medium hover:underline"
                  onClick={() => onSelect(tenant)}
                  type="button"
                >
                  {tenant.tenantName}
                </button>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">{tenant.uuid}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{tenant.primaryDomain}</td>
              <td className="px-4 py-2.5">
                <WorkspaceStatusBadge
                  label={tenant.status}
                  tone={tenant.status === "active" ? "success" : "danger"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tenants.length === 0 ? (
        <WorkspaceTableEmptyState>No tenants found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
