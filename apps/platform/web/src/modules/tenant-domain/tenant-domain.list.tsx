import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@codexsun/ui/workspace/table";
import type { TenantDomainRecord } from "./tenant-domain.types";

export function TenantDomainTable({
  domains,
  loading,
  onEdit,
  onView
}: {
  domains: TenantDomainRecord[];
  loading: boolean;
  onEdit: (domain: TenantDomainRecord) => void;
  onView: (domain: TenantDomainRecord) => void;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <WorkspaceTableHeaderCell>Domain</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>UUID</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Tenant</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Type</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr className="border-b border-border/70 last:border-b-0" key={domain.id}>
                <td className="px-4 py-2.5 font-mono text-xs">{domain.domain}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {domain.uuid}
                </td>
                <td className="px-4 py-2.5">{domain.tenantName}</td>
                <td className="px-4 py-2.5">
                  <WorkspaceStatusBadge
                    label={domain.isPrimary ? "Primary" : "Alias"}
                    tone={domain.isPrimary ? "success" : "neutral"}
                  />
                </td>
                <td className="px-4 py-1.5 text-right">
                  <WorkspaceRowActions
                    onEdit={() => onEdit(domain)}
                    onView={() => onView(domain)}
                    title={domain.domain}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {domains.length === 0 && loading ? <WorkspaceTableLoadingState /> : null}
      {domains.length === 0 && !loading ? (
        <WorkspaceTableEmptyState>No domains found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
