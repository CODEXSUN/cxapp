import { useState } from "react";
import { CheckCircle2Icon, Globe2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceFormBanner, WorkspaceFormField } from "@codexsun/ui/workspace/upsert";
import { WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import {
  useTenantDomainControlMutations,
  useTenantDomainMappingsQuery
} from "./tenant-domain.hooks";
import { normalizeTenantDomain } from "./tenant-domain.services";

export function TenantDomainControl({ tenantId }: { tenantId: number }) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const query = useTenantDomainMappingsQuery(tenantId);
  const mutations = useTenantDomainControlMutations(tenantId);
  const busy = mutations.create.isPending || mutations.setPrimary.isPending;

  const addDomain = () => {
    const normalized = normalizeTenantDomain(domain);
    if (!normalized) {
      setError("Enter a valid domain mapping.");
      return;
    }
    setError("");
    mutations.create.mutate(normalized, {
      onError: (value) => showError("Domain mapping failed", value),
      onSuccess: () => {
        setDomain("");
        toast.success("Domain mapping added");
      }
    });
  };

  return (
    <div className="space-y-4">
      <WorkspaceShowCard title="Add domain mapping">
        <div className="space-y-3 p-4">
          {error ? <WorkspaceFormBanner title="Invalid domain">{error}</WorkspaceFormBanner> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <WorkspaceFormField label="Domain">
                <Input
                  value={domain}
                  placeholder="customer.example.com"
                  onChange={(event) => {
                    setError("");
                    setDomain(event.target.value);
                  }}
                />
              </WorkspaceFormField>
            </div>
            <Button type="button" disabled={busy} onClick={addDomain}>
              <PlusIcon className="size-4" />
              Add mapping
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCwIcon className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </WorkspaceShowCard>

      <WorkspaceTablePanel>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <WorkspaceTableHeaderCell>Domain</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Mapping</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((mapping) => (
              <tr className="border-b border-border/70 last:border-b-0" key={mapping.id}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-mono text-xs">
                    <Globe2Icon className="size-4 text-muted-foreground" />
                    {mapping.domain}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={mapping.isPrimary ? "Primary" : "Mapped"}
                    tone={mapping.isPrimary ? "success" : "info"}
                  />
                </td>
                <td className="px-4 py-3">
                  {mapping.isPrimary ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2Icon className="size-4" /> Active primary
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        mutations.setPrimary.mutate(mapping.domain, {
                          onError: (value) => showError("Primary domain update failed", value),
                          onSuccess: () => toast.success("Primary domain updated")
                        })
                      }
                    >
                      Set primary
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!query.isLoading && (query.data ?? []).length === 0 ? (
          <WorkspaceTableEmptyState>No domain mappings configured.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>
    </div>
  );
}

function showError(title: string, error: unknown) {
  toast.error(title, {
    description: error instanceof Error ? error.message : "The domain operation could not complete."
  });
}
