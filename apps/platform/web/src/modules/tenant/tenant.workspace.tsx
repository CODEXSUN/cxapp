import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, RefreshCw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceStatusBadge, WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@codexsun/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceUpsertPage
} from "@codexsun/ui/workspace/upsert";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { TenantPrimaryDomainField } from "../tenant-domain/tenant-domain.form";
import {
  defaultTenantDomain,
  normalizeTenantDomain
} from "../tenant-domain/tenant-domain.services";
import { usePlatformAppsQuery, type PlatformApp } from "../app-registry";
import { TenantDatabaseControl } from "../tenant-database";
import { TenantDomainControl } from "../tenant-domain";
import { TenantActivityControl } from "./tenant.activity";
import { TenantAppConnections, TenantAppSelectionCard } from "./tenant.apps";
import { TenantIdentityControl } from "./tenant.identity";
import {
  createTenant,
  listTenantActivity,
  listTenants,
  restoreTenant as restoreTenantRecord,
  suspendTenant as suspendTenantRecord,
  updateTenant
} from "./tenant.services";
import type { AuditEventDTO, Tenant, TenantSavePayload } from "./tenant.types";
import {
  defaultLandingApp,
  defaultTenantModuleKeys,
  normalizeModuleKeys,
  platformAppRegistry,
  type PlatformAppId
} from "../../app/app-registry";

type TenantView =
  | { mode: "list" }
  | { mode: "show"; tenant: Tenant }
  | { mode: "upsert"; tenant: Tenant | null; returnTo: "list" | "show" };

const filterOptions = [
  { id: "all", label: "All tenants" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "provisioning", label: "Provisioning" },
  { id: "suspended", label: "Suspended" }
];

const columnOptions = [
  { id: "tenant", label: "Tenant" },
  { id: "uuid", label: "UUID" },
  { id: "corporateId", label: "Corporate ID" },
  { id: "mobile", label: "Mobile" },
  { id: "domain", label: "Domain" },
  { id: "slug", label: "Slug" },
  { id: "database", label: "Database" },
  { id: "companies", label: "Companies" },
  { id: "status", label: "Status" }
];

export function TenantList({ onBack: _onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<TenantView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    companies: true,
    corporateId: true,
    database: true,
    domain: true,
    mobile: false,
    slug: false,
    status: true,
    tenant: true,
    uuid: true
  });

  const tenantsQuery = useQuery<Tenant[]>({
    queryKey: ["admin", "tenants"],
    queryFn: listTenants
  });

  const createMutation = useMutation({
    mutationFn: (tenant: TenantSavePayload) => createTenant(toTenantApiPayload(tenant)),
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      toast.success("Tenant saved", {
        description: `${tenant.tenantName} is ready in the tenant list.`
      });
      setView({ mode: "show", tenant });
    },
    onError: (error) => showTenantError("Tenant save failed", error)
  });

  const updateMutation = useMutation({
    mutationFn: (tenant: TenantSavePayload & { id: number }) =>
      updateTenant({ ...toTenantApiPayload(tenant), id: tenant.id }),
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      toast.success("Tenant updated", {
        description: `${tenant.tenantName} was updated successfully.`
      });
      setView({ mode: "show", tenant });
    },
    onError: (error) => showTenantError("Tenant update failed", error)
  });

  const suspendMutation = useMutation({
    mutationFn: suspendTenantRecord,
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      toast.warning("Tenant suspended", {
        description: `${tenant.tenantName} is no longer active.`
      });
      setView((current) => (current.mode === "show" ? { mode: "show", tenant } : current));
    },
    onError: (error) => showTenantError("Tenant suspend failed", error)
  });

  const restoreMutation = useMutation({
    mutationFn: restoreTenantRecord,
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      toast.info("Tenant restored", {
        description: `${tenant.tenantName} is active again.`
      });
      setView((current) => (current.mode === "show" ? { mode: "show", tenant } : current));
    },
    onError: (error) => showTenantError("Tenant restore failed", error)
  });
  const tenantActivityQuery = useQuery<AuditEventDTO[]>({
    enabled: view.mode === "show",
    queryKey: ["admin", "activity", "tenant", view.mode === "show" ? String(view.tenant.id) : ""],
    queryFn: () => listTenantActivity(view.mode === "show" ? view.tenant.id : "")
  });

  const tenants = tenantsQuery.data ?? [];
  const filteredTenants = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesSearch =
        !term ||
        [
          tenant.tenantName,
          tenant.uuid,
          tenant.tenantCode,
          tenant.corporateId ?? "",
          tenant.mobile ?? "",
          tenant.primaryDomain,
          tenant.slug,
          tenant.dbName,
          tenant.status
        ].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchValue, statusFilter, tenants]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / rowsPerPage));
  const pageTenants = filteredTenants.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  function saveTenant(input: TenantFormState) {
    if (input.id) {
      updateMutation.mutate({
        ...toTenantSavePayload(input),
        id: input.id
      });
      return;
    }
    createMutation.mutate(toTenantSavePayload(input));
  }

  function suspendTenant(tenant: Tenant) {
    suspendMutation.mutate(tenant.id);
  }

  function restoreTenant(tenant: Tenant) {
    restoreMutation.mutate(tenant.id);
  }

  function tenantSaveErrorMessage() {
    const error = createMutation.error ?? updateMutation.error;
    return error instanceof Error ? error.message : "";
  }

  if (view.mode === "show") {
    return (
      <TenantShowPage
        tenant={view.tenant}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "upsert", tenant: view.tenant, returnTo: "show" })}
        onRestore={() => restoreTenant(view.tenant)}
        onSuspend={() => suspendTenant(view.tenant)}
        onUpdated={(tenant) => setView({ mode: "show", tenant })}
        activity={tenantActivityQuery.data ?? []}
        activityLoading={tenantActivityQuery.isFetching}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <TenantUpsertPage
        errorMessage={tenantSaveErrorMessage()}
        loading={createMutation.isPending || updateMutation.isPending}
        tenant={view.tenant}
        onBack={() =>
          setView(
            view.returnTo === "show" && view.tenant
              ? { mode: "show", tenant: view.tenant }
              : { mode: "list" }
          )
        }
        onSubmit={saveTenant}
      />
    );
  }

  return (
    <WorkspacePage
      title="Tenants"
      description="Create and review tenant records with code, status, database context, and lifecycle controls."
      technicalName="page.tenant.list"
      actions={
        <div className="flex items-center gap-2">
          <Button
            disabled={tenantsQuery.isFetching}
            onClick={() => void tenantsQuery.refetch()}
            type="button"
            variant="outline"
            className="h-9 rounded-md"
          >
            <RefreshCw className={cn("size-4", tenantsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md"
            onClick={() => setView({ mode: "upsert", tenant: null, returnTo: "list" })}
          >
            <Plus className="size-4" />
            New tenant
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
        searchPlaceholder="Search tenant, corporate ID, domain, mobile, slug, database, or status"
        searchValue={searchValue}
      />
      <WorkspaceTablePanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <TenantHeader>#</TenantHeader>
                {visibleColumns.tenant ? (
                  <TenantHeader>
                    Tenant <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.uuid ? (
                  <TenantHeader>
                    UUID <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.corporateId ? (
                  <TenantHeader>
                    Corporate ID <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.mobile ? (
                  <TenantHeader>
                    Mobile <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.domain ? (
                  <TenantHeader>
                    Domain <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.slug ? (
                  <TenantHeader>
                    Slug <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.database ? (
                  <TenantHeader>
                    Database <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.companies ? (
                  <TenantHeader>
                    Companies <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                {visibleColumns.status ? (
                  <TenantHeader>
                    Status <span className="text-muted-foreground">↕</span>
                  </TenantHeader>
                ) : null}
                <TenantHeader className="text-right">Action</TenantHeader>
              </tr>
            </thead>
            <tbody>
              {pageTenants.map((tenant, index) => {
                const summary = toTenantSummary(tenant);
                const suspended = tenant.status === "suspended" || tenant.status === "inactive";
                return (
                  <tr
                    key={tenant.id}
                    className={cn(
                      "border-b border-border/70 last:border-b-0",
                      suspended && "bg-muted/20 text-muted-foreground"
                    )}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    {visibleColumns.tenant ? (
                      <td className="px-4 py-2.5">
                        <button
                          className="max-w-72 truncate font-medium hover:underline"
                          type="button"
                          onClick={() => setView({ mode: "show", tenant })}
                        >
                          {tenant.tenantName}
                        </button>
                      </td>
                    ) : null}
                    {visibleColumns.uuid ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.uuid}
                      </td>
                    ) : null}
                    {visibleColumns.corporateId ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.corporateId ?? "-"}
                      </td>
                    ) : null}
                    {visibleColumns.mobile ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.mobile ?? "-"}
                      </td>
                    ) : null}
                    {visibleColumns.domain ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.primaryDomain || "-"}
                      </td>
                    ) : null}
                    {visibleColumns.slug ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.slug}
                      </td>
                    ) : null}
                    {visibleColumns.database ? (
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {tenant.dbName}
                      </td>
                    ) : null}
                    {visibleColumns.companies ? (
                      <td className="px-4 py-2.5 tabular-nums">{summary.companyCount}</td>
                    ) : null}
                    {visibleColumns.status ? (
                      <td className="px-4 py-2.5">
                        <WorkspaceStatusBadge
                          label={tenant.status}
                          tone={statusTone(tenant.status)}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-1.5 text-right">
                      <WorkspaceRowActions
                        title={tenant.tenantName}
                        deleteLabel="Suspend"
                        isSuspended={suspended}
                        restoreLabel="Restore"
                        onDelete={() => suspendTenant(tenant)}
                        onEdit={() => setView({ mode: "upsert", tenant, returnTo: "list" })}
                        onRestore={() => restoreTenant(tenant)}
                        onView={() => setView({ mode: "show", tenant })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageTenants.length === 0 && tenantsQuery.isFetching ? (
          <WorkspaceTableLoadingState />
        ) : null}
        {pageTenants.length === 0 && !tenantsQuery.isFetching ? (
          <WorkspaceTableEmptyState>No tenants found.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredTenants.length)}
        singularLabel="tenants"
        totalCount={filteredTenants.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
      />
    </WorkspacePage>
  );
}

function TenantShowPage({
  activity,
  activityLoading,
  tenant,
  onBack,
  onEdit,
  onRestore,
  onSuspend,
  onUpdated
}: {
  activity: AuditEventDTO[];
  activityLoading: boolean;
  tenant: Tenant;
  onBack: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onSuspend: () => void;
  onUpdated: (tenant: Tenant) => void;
}) {
  const suspended = tenant.status === "suspended" || tenant.status === "inactive";
  const [activeTab, setActiveTab] = useState("overview");
  const tabs: WorkspaceAnimatedTab[] = [
    {
      label: "Overview",
      value: "overview",
      content: (
        <div className="space-y-4">
          <TenantIdentityControl tenant={tenant} />
          <TenantActivityControl events={activity} loading={activityLoading} />
        </div>
      )
    },
    {
      label: "Database",
      value: "database",
      content: <TenantDatabaseControl tenantId={tenant.id} />
    },
    {
      label: "Domains",
      value: "domains",
      content: <TenantDomainControl tenantId={tenant.id} />
    },
    {
      label: "App connections",
      value: "apps",
      content: <TenantAppConnections tenant={tenant} onUpdated={onUpdated} />
    }
  ];

  return (
    <WorkspacePage
      title={tenant.tenantName}
      description="Control tenant identity, live database setup, domains, and connected applications."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button type="button" className="h-9 rounded-md" onClick={onEdit}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={suspended ? onRestore : onSuspend}
          >
            {suspended ? "Restore" : "Suspend"}
          </Button>
        </div>
      }
    >
      <WorkspaceAnimatedTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
    </WorkspacePage>
  );
}

type TenantFormState = {
  corporateId: string;
  dbHost: string;
  dbName: string;
  dbPort: string;
  dbSecretRef: string;
  dbType: string;
  dbUser: string;
  defaultLandingApp: PlatformAppId;
  disabledModuleKeys: string[];
  enabledModuleKeys: string[];
  id?: number;
  mobile: string;
  payloadSettings: Record<string, unknown>;
  portalBrandName: string;
  portalEyebrow: string;
  portalFeatures: string;
  portalFooterText: string;
  portalHeadline: string;
  portalPosts: string;
  portalPublicSiteUrl: string;
  portalSlides: string;
  portalSummary: string;
  portalTheme: "blue" | "emerald" | "slate" | "violet";
  primaryDomain: string;
  slug: string;
  tenantCode: string;
  tenantName: string;
  status: string;
};

type TenantAppAccess = {
  appId: PlatformAppId;
  alwaysEnabled: boolean;
  description: string;
  enabled: boolean;
  moduleKey: string;
  name: string;
};

function TenantUpsertPage({
  errorMessage,
  loading,
  tenant,
  onBack,
  onSubmit
}: {
  errorMessage?: string;
  loading: boolean;
  tenant: Tenant | null;
  onBack: () => void;
  onSubmit: (tenant: TenantFormState) => void;
}) {
  const isEdit = tenant !== null;
  const appsQuery = usePlatformAppsQuery();
  const availableApps = useMemo(
    () => tenantAppAccessFromRegistry(appsQuery.data),
    [appsQuery.data]
  );
  const initialEnabledKeys = normalizeModuleKeys(
    tenant?.enabledModuleKeys ??
      availableApps.filter((app) => app.enabled).map((app) => app.moduleKey)
  );
  const initialDisabledKeys = disabledModuleKeysFromPayload(
    tenant?.payloadSettings,
    availableApps,
    initialEnabledKeys
  );
  const initialPortal = portalSettingsFromPayload(tenant?.payloadSettings);
  const [form, setForm] = useState<TenantFormState>({
    corporateId: tenant?.corporateId ?? toCorporateId(tenant?.tenantCode ?? ""),
    dbHost: tenant?.dbHost ?? "localhost",
    dbName: tenant?.dbName ?? toDatabaseName(tenant?.tenantCode ?? ""),
    dbPort: String(tenant?.dbPort ?? 3306),
    dbSecretRef: tenant?.dbSecretRef ?? "DB_PASSWORD",
    dbType: tenant?.dbType ?? "mariadb",
    dbUser: tenant?.dbUser ?? "root",
    defaultLandingApp: defaultLandingApp(
      tenant?.defaultLandingApp ?? landingAppFromPayload(tenant?.payloadSettings),
      tenant?.enabledModuleKeys ?? []
    ),
    disabledModuleKeys: initialDisabledKeys,
    enabledModuleKeys: initialEnabledKeys,
    ...(tenant ? { id: tenant.id } : {}),
    mobile: tenant?.mobile ?? "",
    payloadSettings: tenant?.payloadSettings ?? {},
    portalBrandName: settingText(initialPortal.brandName),
    portalEyebrow: settingText(initialPortal.eyebrow),
    portalFeatures: serializePortalContent(initialPortal.features),
    portalFooterText: settingText(initialPortal.footerText),
    portalHeadline: settingText(initialPortal.headline),
    portalPosts: serializePortalContent(initialPortal.posts, true),
    portalPublicSiteUrl: settingText(initialPortal.publicSiteUrl),
    portalSlides: serializePortalContent(initialPortal.slides),
    portalSummary: settingText(initialPortal.summary),
    portalTheme: portalTheme(initialPortal.theme),
    primaryDomain:
      tenant?.primaryDomain ?? defaultTenantDomain(tenant?.slug ?? tenant?.tenantCode ?? ""),
    slug: tenant?.slug ?? toSlug(tenant?.tenantCode ?? ""),
    status: tenant?.status ?? "active",
    tenantCode: tenant?.tenantCode ?? "",
    tenantName: tenant?.tenantName ?? ""
  });
  const [activeTab, setActiveTab] = useState("details");
  const [localBanner, setLocalBanner] = useState("");
  const [appAccess, setAppAccess] = useState(() =>
    availableApps.map((app) => ({
      ...app,
      enabled:
        app.alwaysEnabled ||
        (tenant
          ? initialEnabledKeys.includes(app.moduleKey) &&
            !initialDisabledKeys.includes(app.moduleKey)
          : app.enabled)
    }))
  );
  const [corporateIdTouched, setCorporateIdTouched] = useState(false);
  const [primaryDomainTouched, setPrimaryDomainTouched] = useState(Boolean(tenant?.primaryDomain));
  const enabledAppCount = appAccess.filter((app) => app.enabled).length;

  const tabs: WorkspaceAnimatedTab[] = [
    {
      label: "Details",
      value: "details",
      content: (
        <WorkspaceFormPanel
          footer={
            <>
              <Button
                type="button"
                className="rounded-md bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setActiveTab("database")}
              >
                Next
              </Button>
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>
                <X className="size-4" />
                Cancel
              </Button>
            </>
          }
        >
          <WorkspaceFormGrid columns={2}>
            <WorkspaceFormField label="Tenant name" required>
              <Input
                className="h-11 rounded-md"
                value={form.tenantName}
                onChange={(event) => {
                  setLocalBanner("");
                  setForm((current) => ({ ...current, tenantName: event.target.value }));
                }}
                required
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Tenant code" required>
              <div className="flex gap-2">
                <Input
                  className="h-11 rounded-md font-mono uppercase"
                  value={form.tenantCode}
                  onChange={(event) => {
                    setLocalBanner("");
                    const tenantCode = event.target.value;
                    setForm((current) => ({
                      ...current,
                      corporateId: corporateIdTouched
                        ? current.corporateId
                        : toCorporateId(tenantCode),
                      dbName: toDatabaseName(tenantCode),
                      primaryDomain: primaryDomainTouched
                        ? current.primaryDomain
                        : defaultTenantDomain(tenantCode),
                      slug: toSlug(tenantCode),
                      tenantCode
                    }));
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md px-4"
                  onClick={() => {
                    const tenantCode = toSlug(form.tenantName || form.tenantCode);
                    setCorporateIdTouched(false);
                    setPrimaryDomainTouched(false);
                    setForm((current) => ({
                      ...current,
                      corporateId: toCorporateId(tenantCode),
                      dbName: toDatabaseName(tenantCode),
                      primaryDomain: defaultTenantDomain(tenantCode),
                      slug: toSlug(tenantCode),
                      tenantCode
                    }));
                  }}
                >
                  Auto
                </Button>
              </div>
            </WorkspaceFormField>
            <WorkspaceFormField label="Corporate ID">
              <Input
                className="h-11 rounded-md font-mono uppercase"
                value={form.corporateId}
                onChange={(event) => {
                  setCorporateIdTouched(true);
                  setForm((current) => ({ ...current, corporateId: event.target.value }));
                }}
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Mobile">
              <Input
                className="h-11 rounded-md"
                value={form.mobile}
                onChange={(event) =>
                  setForm((current) => ({ ...current, mobile: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Slug">
              <Input
                className="h-11 rounded-md"
                value={form.slug}
                onChange={(event) => {
                  const slug = event.target.value;
                  setForm((current) => ({
                    ...current,
                    primaryDomain: primaryDomainTouched
                      ? current.primaryDomain
                      : defaultTenantDomain(slug),
                    slug
                  }));
                }}
              />
            </WorkspaceFormField>
            <TenantPrimaryDomainField
              value={form.primaryDomain}
              onTouched={() => setPrimaryDomainTouched(true)}
              onChange={(primaryDomain) => setForm((current) => ({ ...current, primaryDomain }))}
            />
            <WorkspaceSwitchCard
              fieldLabel="Status"
              ariaLabel="Tenant active status"
              checked={form.status === "active"}
              description="Active tenants can be selected for workspace access."
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, status: checked ? "active" : "inactive" }))
              }
            />
          </WorkspaceFormGrid>
        </WorkspaceFormPanel>
      )
    },
    {
      label: "Database",
      value: "database",
      content: (
        <WorkspaceFormPanel
          footer={
            <>
              <Button
                type="button"
                className="rounded-md bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setActiveTab("settings")}
              >
                Next
              </Button>
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>
                <X className="size-4" />
                Cancel
              </Button>
            </>
          }
        >
          <WorkspaceFormGrid columns={2}>
            <WorkspaceFormField label="Database type">
              <Input
                className="h-11 rounded-md"
                value={form.dbType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbType: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Host">
              <Input
                className="h-11 rounded-md"
                value={form.dbHost}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbHost: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Port">
              <Input
                className="h-11 rounded-md"
                value={form.dbPort}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbPort: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Database name">
              <Input
                className="h-11 rounded-md font-mono"
                value={form.dbName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbName: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="User">
              <Input
                className="h-11 rounded-md"
                value={form.dbUser}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbUser: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Secret reference">
              <Input
                className="h-11 rounded-md font-mono"
                value={form.dbSecretRef}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dbSecretRef: event.target.value }))
                }
              />
            </WorkspaceFormField>
          </WorkspaceFormGrid>
        </WorkspaceFormPanel>
      )
    },
    {
      label: "Settings",
      value: "settings",
      content: (
        <WorkspaceFormPanel
          footer={
            <>
              <Button
                type="button"
                className="rounded-md bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setActiveTab("app-portal")}
              >
                Next
              </Button>
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>
                <X className="size-4" />
                Cancel
              </Button>
            </>
          }
        >
          <div className="rounded-md border border-border/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Tenant app access</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the app areas available to this tenant workspace.
                </p>
              </div>
              <span className="rounded-md border border-border/70 bg-background px-3 py-1 text-xs font-semibold">
                {enabledAppCount} enabled
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-border/70 p-4">
            <WorkspaceFormField label="Landing app">
              <WorkspaceSelect
                value={form.defaultLandingApp}
                options={appAccess
                  .filter((app) => app.enabled)
                  .map((app) => {
                    const registry = platformAppRegistry.find(
                      (item) => item.moduleKey === app.moduleKey
                    );
                    return { label: app.name, value: registry?.id ?? "application" };
                  })}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    defaultLandingApp: value as PlatformAppId
                  }))
                }
              />
            </WorkspaceFormField>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {appAccess.map((app, index) => (
              <TenantAppSelectionCard
                key={app.name}
                alwaysEnabled={app.alwaysEnabled}
                appId={app.appId}
                checked={app.enabled}
                description={app.description}
                label={app.name}
                moduleKey={app.moduleKey}
                onCheckedChange={(enabled) =>
                  setAppAccess((current) => {
                    const next = current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, enabled } : item
                    );
                    const enabledKeys = normalizeModuleKeys(
                      next.filter((item) => item.enabled).map((item) => item.moduleKey)
                    );
                    const disabledKeys = next
                      .filter((item) => !item.enabled && !item.alwaysEnabled)
                      .map((item) => item.moduleKey);
                    const enabledIds = next
                      .filter((item) => item.enabled)
                      .map((item) => item.appId)
                      .filter(Boolean);
                    setForm((currentForm) => ({
                      ...currentForm,
                      disabledModuleKeys: disabledKeys,
                      enabledModuleKeys: enabledKeys,
                      defaultLandingApp: enabledIds.includes(currentForm.defaultLandingApp)
                        ? currentForm.defaultLandingApp
                        : "application"
                    }));
                    return next;
                  })
                }
              />
            ))}
          </div>
        </WorkspaceFormPanel>
      )
    },
    {
      label: "App portal",
      value: "app-portal",
      content: (
        <WorkspaceFormPanel
          footer={
            <>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-md bg-foreground text-background hover:bg-foreground/90"
              >
                <Save className="size-4" />
                {loading ? "Saving..." : isEdit ? "Update tenant" : "Save"}
              </Button>
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>
                <X className="size-4" />
                Cancel
              </Button>
            </>
          }
        >
          <div className="rounded-md border border-border/70 p-4">
            <h2 className="text-base font-semibold text-foreground">Public app workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This content appears only on the tenant app domain. The separate marketing site is not
              changed.
            </p>
          </div>
          <WorkspaceFormGrid columns={2}>
            <WorkspaceFormField label="Portal brand">
              <Input
                className="h-11 rounded-md"
                value={form.portalBrandName}
                placeholder={form.tenantName || "Tenant name"}
                onChange={(event) =>
                  setForm((current) => ({ ...current, portalBrandName: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Theme">
              <WorkspaceSelect
                value={form.portalTheme}
                options={[
                  { label: "Blue", value: "blue" },
                  { label: "Emerald", value: "emerald" },
                  { label: "Slate", value: "slate" },
                  { label: "Violet", value: "violet" }
                ]}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    portalTheme: value as TenantFormState["portalTheme"]
                  }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Eyebrow">
              <Input
                className="h-11 rounded-md"
                value={form.portalEyebrow}
                placeholder="Business workspace"
                onChange={(event) =>
                  setForm((current) => ({ ...current, portalEyebrow: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Public marketing site URL">
              <Input
                className="h-11 rounded-md"
                type="url"
                value={form.portalPublicSiteUrl}
                placeholder="https://tenant.com"
                onChange={(event) =>
                  setForm((current) => ({ ...current, portalPublicSiteUrl: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Headline">
              <Input
                className="h-11 rounded-md"
                value={form.portalHeadline}
                placeholder="One workspace. Clear work. Every day."
                onChange={(event) =>
                  setForm((current) => ({ ...current, portalHeadline: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Footer note">
              <Input
                className="h-11 rounded-md"
                value={form.portalFooterText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, portalFooterText: event.target.value }))
                }
              />
            </WorkspaceFormField>
          </WorkspaceFormGrid>
          <WorkspaceFormField label="Hero summary">
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={form.portalSummary}
              placeholder="Describe what this tenant workspace brings together."
              onChange={(event) =>
                setForm((current) => ({ ...current, portalSummary: event.target.value }))
              }
            />
          </WorkspaceFormField>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <PortalLinesField
              label="Slider"
              hint="Label | Title | Description"
              value={form.portalSlides}
              onChange={(portalSlides) => setForm((current) => ({ ...current, portalSlides }))}
            />
            <PortalLinesField
              label="Features"
              hint="Label | Title | Description"
              value={form.portalFeatures}
              onChange={(portalFeatures) => setForm((current) => ({ ...current, portalFeatures }))}
            />
            <PortalLinesField
              label="Updates / blog"
              hint="Label | Title | Description | URL"
              value={form.portalPosts}
              onChange={(portalPosts) => setForm((current) => ({ ...current, portalPosts }))}
            />
          </div>
        </WorkspaceFormPanel>
      )
    }
  ];

  return (
    <WorkspaceUpsertPage
      title={isEdit ? "Edit tenant" : "New tenant"}
      description="Update tenant identity, database context, and lifecycle status."
      action={
        <Button type="button" variant="outline" onClick={onBack} className="h-9 rounded-md">
          <X className="size-4" />
          Cancel
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (activeTab === "details") {
            if (!form.tenantName.trim()) {
              setLocalBanner("Tenant name is required.");
              return;
            }
            if (!form.tenantCode.trim()) {
              setLocalBanner("Tenant code is required.");
              return;
            }
            if (!form.primaryDomain.trim()) {
              setLocalBanner("Primary domain is required.");
              return;
            }
            setLocalBanner("");
            setActiveTab("database");
            return;
          }
          if (activeTab === "database") {
            setActiveTab("settings");
            return;
          }
          if (activeTab === "settings") {
            setActiveTab("app-portal");
            return;
          }
          if (!form.tenantName.trim()) {
            setActiveTab("details");
            setLocalBanner("Tenant name is required.");
            return;
          }
          if (!form.tenantCode.trim()) {
            setActiveTab("details");
            setLocalBanner("Tenant code is required.");
            return;
          }
          if (!form.primaryDomain.trim()) {
            setActiveTab("details");
            setLocalBanner("Primary domain is required.");
            return;
          }
          setLocalBanner("");
          onSubmit({
            ...form,
            disabledModuleKeys: appAccess
              .filter((app) => !app.enabled && !app.alwaysEnabled)
              .map((app) => app.moduleKey),
            enabledModuleKeys: normalizeModuleKeys(
              appAccess.filter((app) => app.enabled).map((app) => app.moduleKey)
            )
          });
        }}
      >
        <div className="rounded-md border border-border/70 bg-card/95 p-5 shadow-sm">
          {localBanner || errorMessage ? (
            <WorkspaceFormBanner title={localBanner ? "Missing required field" : "Could not save"}>
              {localBanner || errorMessage}
            </WorkspaceFormBanner>
          ) : null}
          <WorkspaceAnimatedTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
        </div>
      </form>
    </WorkspaceUpsertPage>
  );
}

function PortalLinesField({
  hint,
  label,
  onChange,
  value
}: {
  hint: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <WorkspaceFormField label={`${label} — ${hint}`}>
      <textarea
        className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        value={value}
        placeholder={hint}
        onChange={(event) => onChange(event.target.value)}
      />
    </WorkspaceFormField>
  );
}

function TenantHeader({ children, className }: { children: ReactNode; className?: string }) {
  const label = Array.isArray(children) ? children[0] : children;

  return <WorkspaceTableHeaderCell className={className}>{label}</WorkspaceTableHeaderCell>;
}

function toTenantSavePayload(form: TenantFormState): TenantSavePayload {
  const enabledModuleKeys = normalizeModuleKeys(form.enabledModuleKeys);
  const landingApp = defaultLandingApp(form.defaultLandingApp, enabledModuleKeys);
  const disabledModuleKeys = form.disabledModuleKeys.filter(
    (key) => key !== "platform.application"
  );

  return {
    corporateId: form.corporateId.trim() || null,
    dbHost: form.dbHost.trim() || "localhost",
    dbName: form.dbName.trim() || toDatabaseName(form.tenantCode),
    dbPort: Number(form.dbPort) || 3306,
    dbSecretRef: form.dbSecretRef.trim() || "DB_PASSWORD",
    dbType: form.dbType.trim() || "mariadb",
    dbUser: form.dbUser.trim() || "root",
    defaultLandingApp: landingApp,
    enabledModuleKeys,
    mobile: form.mobile.replace(/\D/g, "") || null,
    payloadSettings: {
      ...form.payloadSettings,
      appPortal: {
        ...(isRecord(form.payloadSettings.appPortal) ? form.payloadSettings.appPortal : {}),
        brandName: form.portalBrandName.trim(),
        eyebrow: form.portalEyebrow.trim(),
        features: parsePortalContent(form.portalFeatures),
        footerText: form.portalFooterText.trim(),
        headline: form.portalHeadline.trim(),
        posts: parsePortalContent(form.portalPosts, true),
        publicSiteUrl: form.portalPublicSiteUrl.trim(),
        slides: parsePortalContent(form.portalSlides),
        summary: form.portalSummary.trim(),
        theme: form.portalTheme
      },
      apps: { disabled: disabledModuleKeys, enabled: enabledModuleKeys },
      landing: { app: landingApp, mode: "tenant" }
    },
    primaryDomain:
      normalizeTenantDomain(form.primaryDomain) ||
      defaultTenantDomain(form.slug || form.tenantCode),
    slug: form.slug.trim() || toSlug(form.tenantCode),
    status: form.status,
    tenantCode: form.tenantCode.trim(),
    tenantName: form.tenantName.trim()
  };
}

function portalSettingsFromPayload(payloadSettings: Record<string, unknown> | undefined) {
  return isRecord(payloadSettings?.appPortal) ? payloadSettings.appPortal : {};
}

function portalTheme(value: unknown): TenantFormState["portalTheme"] {
  return value === "emerald" || value === "slate" || value === "violet" ? value : "blue";
}

function settingText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function serializePortalContent(value: unknown, includeHref = false) {
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const fields = [entry.label, entry.title, entry.description].map(settingText);
      if (includeHref) fields.push(settingText(entry.href));
      return fields[1] && fields[2] ? [fields.join(" | ")] : [];
    })
    .join("\n");
}

function parsePortalContent(value: string, includeHref = false) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.split("|").map((part) => part.trim()))
    .flatMap(([label, title, description, href]) => {
      if (!title || !description) return [];
      return [
        {
          description,
          ...(includeHref ? { href: href || "/login" } : {}),
          label: label || (includeHref ? "Update" : "Workspace"),
          title
        }
      ];
    })
    .slice(0, 6);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTenantApiPayload(tenant: TenantSavePayload) {
  return tenant;
}

function landingAppFromPayload(payloadSettings: Record<string, unknown> | undefined): unknown {
  const landing = payloadSettings?.landing;
  return typeof landing === "object" && landing !== null && "app" in landing
    ? landing.app
    : undefined;
}

function toTenantSummary(tenant: Tenant) {
  const active = tenant.status === "active";
  return {
    activeCompanyCount: active ? 1 : 0,
    companyCount: 1,
    corporateId: tenant.corporateId ?? toCorporateId(tenant.tenantCode),
    database: tenant.dbName
  };
}

function toCorporateId(value: string) {
  return value.trim().toUpperCase();
}

function toDatabaseName(value: string) {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return code ? `${code}_db` : "";
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tenantAppAccessFromRegistry(apps: PlatformApp[] | undefined): TenantAppAccess[] {
  const defaultEnabled = new Set<string>(defaultTenantModuleKeys);
  const source = apps?.length
    ? apps
    : platformAppRegistry.map((app, index) => ({
        alwaysEnabled: app.alwaysEnabled,
        appId: app.id,
        defaultLanding: app.defaultLanding,
        description: app.description,
        id: index,
        label: app.label,
        moduleKey: app.moduleKey,
        stack: app.stack,
        uuid: app.moduleKey
      }));

  return source
    .filter(
      (app) =>
        app.appId === "application" ||
        app.appId === "billing" ||
        app.appId === "mail" ||
        app.appId === "task-manager"
    )
    .map((app) => {
      const local =
        platformAppRegistry.find(
          (item) => item.id === app.appId || item.moduleKey === app.moduleKey
        ) ?? platformAppRegistry[0]!;
      return {
        alwaysEnabled: app.alwaysEnabled || app.moduleKey === "platform.application",
        appId: app.appId as PlatformAppId,
        description: app.description || local.description,
        enabled: app.alwaysEnabled || defaultEnabled.has(app.moduleKey),
        moduleKey: app.moduleKey,
        name: app.label || local.label
      };
    });
}

function disabledModuleKeysFromPayload(
  payloadSettings: Record<string, unknown> | undefined,
  apps: TenantAppAccess[],
  enabledModuleKeys: string[]
) {
  const disabled = isStringArraySetting(payloadSettings?.apps, "disabled");
  if (disabled.length > 0) return disabled.filter((key) => key !== "platform.application");
  return apps
    .filter((app) => !app.alwaysEnabled && !enabledModuleKeys.includes(app.moduleKey))
    .map((app) => app.moduleKey);
}

function isStringArraySetting(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !(key in value)) return [];
  const entry = (value as Record<string, unknown>)[key];
  return Array.isArray(entry)
    ? entry.filter((item): item is string => typeof item === "string")
    : [];
}

function statusTone(status: string) {
  if (status === "active") return "success";
  if (status === "provisioning") return "info";
  if (status === "suspended" || status === "inactive") return "danger";
  return "neutral";
}

function showTenantError(title: string, error: unknown) {
  toast.error(title, {
    description: error instanceof Error ? error.message : "Please try again."
  });
}
