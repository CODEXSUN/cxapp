import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Globe2, Pencil, Plus, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import {
  WorkspaceDetailTable,
  WorkspaceShowCard,
  WorkspaceShowLayout
} from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@codexsun/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceUpsertPage
} from "@codexsun/ui/workspace/upsert";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { listTenants } from "../tenant/tenant.services";
import type { Tenant } from "../tenant/tenant.types";
import {
  createTenantDomain,
  listAllTenantDomains,
  normalizeTenantDomain,
  updateTenantDomain
} from "./tenant-domain.services";
import type { TenantDomainRecord, TenantDomainSavePayload } from "./tenant-domain.types";

type DomainView =
  | { mode: "list" }
  | { mode: "show"; domain: TenantDomainRecord }
  | { mode: "upsert"; domain: TenantDomainRecord | null; returnTo: "list" | "show" };

const filterOptions = [
  { id: "all", label: "All domains" },
  { id: "active", label: "Active tenants" },
  { id: "inactive", label: "Inactive tenants" },
  { id: "provisioning", label: "Provisioning tenants" },
  { id: "suspended", label: "Suspended tenants" }
];

const columnOptions = [
  { id: "domain", label: "Domain" },
  { id: "uuid", label: "UUID" },
  { id: "tenant", label: "Tenant" },
  { id: "tenantCode", label: "Tenant code" },
  { id: "primary", label: "Type" },
  { id: "status", label: "Tenant status" }
];

export function TenantDomainList() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<DomainView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    domain: true,
    primary: true,
    status: true,
    tenant: true,
    tenantCode: true,
    uuid: true
  });

  const domainsQuery = useQuery<TenantDomainRecord[]>({
    queryFn: listAllTenantDomains,
    queryKey: ["admin", "tenant-domains"]
  });
  const tenantsQuery = useQuery<Tenant[]>({
    queryFn: listTenants,
    queryKey: ["admin", "tenants"]
  });

  const createMutation = useMutation({
    mutationFn: createTenantDomain,
    onError: (error) => showDomainError("Domain save failed", error),
    onSuccess: async (domain) => {
      await invalidateDomainData(queryClient);
      toast.success("Domain saved", { description: `${domain.domain} is ready.` });
      setView({ domain, mode: "show" });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TenantDomainSavePayload }) =>
      updateTenantDomain(id, payload),
    onError: (error) => showDomainError("Domain update failed", error),
    onSuccess: async (domain) => {
      await invalidateDomainData(queryClient);
      toast.success("Domain updated", {
        description: `${domain.domain} was updated successfully.`
      });
      setView({ domain, mode: "show" });
    }
  });

  const domains = domainsQuery.data ?? [];
  const filteredDomains = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    return domains.filter((domain) => {
      const matchesSearch =
        !term ||
        [
          domain.domain,
          domain.uuid,
          domain.tenantName,
          domain.tenantCode,
          domain.tenantStatus
        ].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (statusFilter === "all" || domain.tenantStatus === statusFilter);
    });
  }, [domains, searchValue, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / rowsPerPage));
  const pageDomains = filteredDomains.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (view.mode === "show") {
    return (
      <DomainShowPage
        domain={view.domain}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ domain: view.domain, mode: "upsert", returnTo: "show" })}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <DomainUpsertPage
        domain={view.domain}
        error={createMutation.error ?? updateMutation.error}
        loading={createMutation.isPending || updateMutation.isPending}
        tenants={tenantsQuery.data ?? []}
        onBack={() =>
          setView(
            view.returnTo === "show" && view.domain
              ? { domain: view.domain, mode: "show" }
              : { mode: "list" }
          )
        }
        onSubmit={(payload) => {
          if (view.domain) {
            updateMutation.mutate({ id: view.domain.id, payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />
    );
  }

  return (
    <WorkspacePage
      title="Domains"
      description="Create and review tenant domains, ownership, primary routing, and tenant status."
      technicalName="page.tenant-domain.list"
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={domainsQuery.isFetching}
            onClick={() => void domainsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", domainsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            onClick={() => setView({ domain: null, mode: "upsert", returnTo: "list" })}
            type="button"
          >
            <Plus className="size-4" />
            New domain
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        columnOptions={columnOptions.map((column) => ({
          ...column,
          checked: visibleColumns[column.id] ?? true,
          onCheckedChange: (checked) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        filterOptions={filterOptions}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        onShowAllColumns={() =>
          setVisibleColumns(Object.fromEntries(columnOptions.map((column) => [column.id, true])))
        }
        searchPlaceholder="Search domain, UUID, tenant, code, or status"
        searchValue={searchValue}
      />

      <WorkspaceTablePanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <WorkspaceTableHeaderCell>#</WorkspaceTableHeaderCell>
                {visibleColumns.domain ? (
                  <WorkspaceTableHeaderCell>Domain</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.uuid ? (
                  <WorkspaceTableHeaderCell>UUID</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.tenant ? (
                  <WorkspaceTableHeaderCell>Tenant</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.tenantCode ? (
                  <WorkspaceTableHeaderCell>Tenant code</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.primary ? (
                  <WorkspaceTableHeaderCell>Type</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.status ? (
                  <WorkspaceTableHeaderCell>Tenant status</WorkspaceTableHeaderCell>
                ) : null}
                <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {pageDomains.map((domain, index) => (
                <tr className="border-b border-border/70 last:border-b-0" key={domain.id}>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.domain ? (
                    <td className="px-4 py-2.5">
                      <button
                        className="max-w-80 truncate font-mono text-xs font-medium hover:underline"
                        onClick={() => setView({ domain, mode: "show" })}
                        type="button"
                      >
                        {domain.domain}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.uuid ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {domain.uuid}
                    </td>
                  ) : null}
                  {visibleColumns.tenant ? (
                    <td className="px-4 py-2.5 font-medium">{domain.tenantName}</td>
                  ) : null}
                  {visibleColumns.tenantCode ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {domain.tenantCode}
                    </td>
                  ) : null}
                  {visibleColumns.primary ? (
                    <td className="px-4 py-2.5">
                      <WorkspaceStatusBadge
                        label={domain.isPrimary ? "Primary" : "Alias"}
                        tone={domain.isPrimary ? "success" : "neutral"}
                      />
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <WorkspaceStatusBadge
                        label={domain.tenantStatus}
                        tone={statusTone(domain.tenantStatus)}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-1.5 text-right">
                    <WorkspaceRowActions
                      onEdit={() => setView({ domain, mode: "upsert", returnTo: "list" })}
                      onView={() => setView({ domain, mode: "show" })}
                      title={domain.domain}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageDomains.length === 0 && domainsQuery.isFetching ? (
          <WorkspaceTableLoadingState />
        ) : null}
        {pageDomains.length === 0 && !domainsQuery.isFetching ? (
          <WorkspaceTableEmptyState>No domains found.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>

      <WorkspacePagination
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredDomains.length)}
        singularLabel="domains"
        totalCount={filteredDomains.length}
        totalPages={totalPages}
      />
    </WorkspacePage>
  );
}

function DomainShowPage({
  domain,
  onBack,
  onEdit
}: {
  domain: TenantDomainRecord;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <WorkspacePage
      title={domain.domain}
      description="Review domain identity, tenant ownership, and routing status."
      actions={
        <div className="flex items-center gap-2">
          <Button className="h-9 rounded-md" onClick={onBack} type="button" variant="outline">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button className="h-9 rounded-md" onClick={onEdit} type="button">
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      }
    >
      <WorkspaceShowLayout>
        <WorkspaceShowCard title="Domain details">
          <WorkspaceDetailTable
            rows={[
              [
                "Domain",
                <span className="font-mono text-xs" key="domain">
                  {domain.domain}
                </span>
              ],
              [
                "UUID",
                <span className="font-mono text-xs" key="uuid">
                  {domain.uuid}
                </span>
              ],
              ["Type", domain.isPrimary ? "Primary" : "Alias"],
              ["Tenant", domain.tenantName],
              [
                "Tenant code",
                <span className="font-mono text-xs" key="code">
                  {domain.tenantCode}
                </span>
              ],
              ["Tenant status", domain.tenantStatus]
            ]}
          />
        </WorkspaceShowCard>
        <WorkspaceShowCard title="Routing">
          <div className="flex items-start gap-3 p-4">
            <Globe2 className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{domain.domain}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Routes requests to {domain.tenantName}.
              </p>
            </div>
          </div>
        </WorkspaceShowCard>
      </WorkspaceShowLayout>
    </WorkspacePage>
  );
}

function DomainUpsertPage({
  domain,
  error,
  loading,
  onBack,
  onSubmit,
  tenants
}: {
  domain: TenantDomainRecord | null;
  error: Error | null;
  loading: boolean;
  onBack: () => void;
  onSubmit: (payload: TenantDomainSavePayload) => void;
  tenants: Tenant[];
}) {
  const [domainValue, setDomainValue] = useState(domain?.domain ?? "");
  const [tenantId, setTenantId] = useState(domain?.tenantId ?? tenants[0]?.id ?? 0);

  return (
    <WorkspaceUpsertPage
      description="Connect a public hostname to its tenant workspace."
      onBack={onBack}
      title={domain ? "Edit domain" : "New domain"}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ domain: normalizeTenantDomain(domainValue), tenantId });
        }}
      >
        <WorkspaceFormPanel
          footer={
            <WorkspaceFormFooter
              onCancel={onBack}
              primaryLabel={domain ? "Save changes" : "Create domain"}
              primaryLoading={loading}
              primaryProps={{
                children: (
                  <>
                    <Save className="size-4" />
                    {domain ? "Save changes" : "Create domain"}
                  </>
                )
              }}
            />
          }
          title="Domain identity"
          description="Domains are normalized automatically and saved as the tenant's primary route."
        >
          {error ? (
            <WorkspaceFormBanner title="Unable to save domain">{error.message}</WorkspaceFormBanner>
          ) : null}
          <WorkspaceFormGrid>
            <WorkspaceFormField label="Domain" required>
              <Input
                className="h-11 rounded-md font-mono"
                onChange={(event) => setDomainValue(event.target.value)}
                onBlur={() => setDomainValue((value) => normalizeTenantDomain(value))}
                placeholder="company.localhost"
                required
                value={domainValue}
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Tenant" required>
              <select
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={Boolean(domain)}
                onChange={(event) => setTenantId(Number(event.target.value))}
                required
                value={tenantId || ""}
              >
                <option disabled value="">
                  Select tenant
                </option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.tenantName} ({tenant.tenantCode})
                  </option>
                ))}
              </select>
            </WorkspaceFormField>
          </WorkspaceFormGrid>
        </WorkspaceFormPanel>
      </form>
    </WorkspaceUpsertPage>
  );
}

function statusTone(status: string): "success" | "danger" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "suspended" || status === "inactive") return "danger";
  if (status === "provisioning") return "warning";
  return "neutral";
}

async function invalidateDomainData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "tenant-domains"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
  ]);
}

function showDomainError(title: string, error: unknown) {
  toast.error(title, { description: error instanceof Error ? error.message : "Please try again." });
}
