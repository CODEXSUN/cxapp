import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent
} from "react";
import {
  Building2Icon,
  CreditCardIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MailIcon,
  RocketIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserRoundIcon
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApplicationLayout } from "@cxapp/ui/layouts/application-layout";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@cxapp/ui/components/alert-dialog";
import { Button } from "@cxapp/ui/components/button";
import { Card } from "@cxapp/ui/components/card";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { Label } from "@cxapp/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@cxapp/ui/components/radio-group";
import { StatusBadge } from "@cxapp/ui/components/StatusBadge";
import { toast } from "sonner";
import { AuthGate } from "../../shared/auth/AuthGate";
import {
  appMenuItemsFor,
  appRootPage,
  appRootUrl,
  appWorkspaceItems,
  enabledAppIds,
  platformAppRegistry,
  type BillingNavigationFeatures,
  type PlatformAppId
} from "../../app/app-registry";
import { getTenantRuntime } from "../../modules/tenant/tenant.services";
import {
  companyBrandName,
  useCompanyBranding
} from "@cxapp/core-web/modules/organisation/company/branding";
import { listCompanies } from "@cxapp/core-web/modules/organisation/company/services";
import { defaultCompanyQueryKey } from "@cxapp/core-web/modules/organisation/default-company/hooks";
import {
  getDefaultCompany,
  saveDefaultCompany
} from "@cxapp/core-web/modules/organisation/default-company/services";
import type { LandingAppOption } from "@cxapp/core-web/modules/organisation/default-company/types";
import { listFinancialYears } from "@cxapp/core-web/modules/organisation/financial-year/services";
import { getSessionIdentity, logout } from "../../shared/api/platform-api";
import { setPlatformDocumentTitle } from "../../shared/document/PageTitle";
import { publishDesktopWorkspace } from "../../shared/desktop/desktop-bridge";
import { publishAccountingYear, publishCompanyContext } from "../../shared/tenant/runtime-context";
import { blogEditorHost } from "../../modules/blog/blog-host";

function lazyWorkspace<Props>(loader: () => Promise<ComponentType<Props>>) {
  return lazy(async () => ({ default: await loader() }));
}

const loadBillingDashboardModule = () => import("@cxapp/billing-web/modules/dashboard");
const loadQuotationModule = () => import("@cxapp/billing-web/modules/quotation");
const loadSalesModule = () => import("@cxapp/billing-web/modules/sales");
const loadPurchaseModule = () => import("@cxapp/billing-web/modules/purchase");
const loadExportSalesModule = () => import("@cxapp/billing-web/modules/export-sales");
const loadPaymentModule = () => import("@cxapp/billing-web/modules/payment");
const loadReceiptModule = () => import("@cxapp/billing-web/modules/receipt");
const loadBillingReportsModule = () => import("@cxapp/billing-web/modules/reports");
const loadAccountsOverviewModule = () => import("@cxapp/accounts-web/modules/overview");
const loadAccountingModule = () => import("@cxapp/accounts-web/modules/accounting");
const loadBlogModule = () => import("@codexsun/blog/web");
const AuditorOverviewWorkspace = lazyWorkspace(() =>
  import("@cxapp/auditor-web/modules/overview").then((module) => module.AuditorOverviewWorkspace)
);

const billingWorkspacePreloaders = [
  loadBillingDashboardModule,
  loadQuotationModule,
  loadSalesModule,
  loadPurchaseModule,
  loadExportSalesModule,
  loadPaymentModule,
  loadReceiptModule,
  loadBillingReportsModule
] as const;

const TaskManagerWorkspace = lazyWorkspace(() =>
  import("../../modules/task-manager").then((module) => module.TaskManagerWorkspace)
);

const AddressTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/contacts/address-types").then(
    (module) => module.AddressTypesWorkspace
  )
);
const BankNamesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/contacts/bank-names").then(
    (module) => module.BankNamesWorkspace
  )
);
const ContactGroupsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/contacts/contact-groups").then(
    (module) => module.ContactGroupsWorkspace
  )
);
const ContactTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/contacts/contact-types").then(
    (module) => module.ContactTypesWorkspace
  )
);
const CityWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/location/city").then((module) => module.CityWorkspace)
);
const CountryWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/location/country").then(
    (module) => module.CountryWorkspace
  )
);
const DistrictWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/location/district").then(
    (module) => module.DistrictWorkspace
  )
);
const PincodeWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/location/pincode").then(
    (module) => module.PincodeWorkspace
  )
);
const StateWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/location/state").then((module) => module.StateWorkspace)
);
const LedgerGroupsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/accounts/ledger-groups").then(
    (module) => module.LedgerGroupsWorkspace
  )
);
const LedgersWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/accounts/ledgers").then(
    (module) => module.LedgersWorkspace
  )
);
const CurrenciesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/others/currencies").then(
    (module) => module.CurrenciesWorkspace
  )
);
const MonthsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/others/months").then((module) => module.MonthsWorkspace)
);
const PaymentTermsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/others/payment-terms").then(
    (module) => module.PaymentTermsWorkspace
  )
);
const PrioritiesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/others/priorities").then(
    (module) => module.PrioritiesWorkspace
  )
);
const SalesTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/others/sales-types").then(
    (module) => module.SalesTypesWorkspace
  )
);
const BrandsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/brands").then((module) => module.BrandsWorkspace)
);
const ColoursWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/colours").then(
    (module) => module.ColoursWorkspace
  )
);
const HsnCodesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/hsn-codes").then(
    (module) => module.HsnCodesWorkspace
  )
);
const ProductCategoriesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/product-categories").then(
    (module) => module.ProductCategoriesWorkspace
  )
);
const ProductGroupsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/product-groups").then(
    (module) => module.ProductGroupsWorkspace
  )
);
const ProductTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/product-types").then(
    (module) => module.ProductTypesWorkspace
  )
);
const SizesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/sizes").then((module) => module.SizesWorkspace)
);
const StylesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/styles").then((module) => module.StylesWorkspace)
);
const TaxesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/taxes").then((module) => module.TaxesWorkspace)
);
const UnitsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/products/units").then((module) => module.UnitsWorkspace)
);
const DestinationsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/workorder/destinations").then(
    (module) => module.DestinationsWorkspace
  )
);
const StockRejectionTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/workorder/stock-rejection-types").then(
    (module) => module.StockRejectionTypesWorkspace
  )
);
const TransportsWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/workorder/transports").then(
    (module) => module.TransportsWorkspace
  )
);
const WarehousesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/workorder/warehouses").then(
    (module) => module.WarehousesWorkspace
  )
);
const WorkOrderTypesWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/common/workorder/work-order-types").then(
    (module) => module.WorkOrderTypesWorkspace
  )
);
const ContactWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/master/contact").then((module) => module.ContactWorkspace)
);
const ProductWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/master/product").then((module) => module.ProductWorkspace)
);
const WorkOrderWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/master/work-order").then((module) => module.WorkOrderWorkspace)
);
const CompanyWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/organisation/company").then((module) => module.CompanyWorkspace)
);
const DefaultCompanyWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/organisation/default-company").then(
    (module) => module.DefaultCompanyWorkspace
  )
);
const FinancialYearWorkspace = lazyWorkspace(() =>
  import("@cxapp/core-web/modules/organisation/financial-year").then(
    (module) => module.FinancialYearWorkspace
  )
);
const QuotationWorkspace = lazyWorkspace(() =>
  loadQuotationModule().then((module) => module.QuotationWorkspace)
);
const QuotationPrintRoutePage = lazyWorkspace(() =>
  loadQuotationModule().then((module) => module.QuotationPrintRoutePage)
);
const SalesWorkspace = lazyWorkspace(() =>
  loadSalesModule().then((module) => module.SalesWorkspace)
);
const SalesPrintRoutePage = lazyWorkspace(() =>
  loadSalesModule().then((module) => module.SalesPrintRoutePage)
);
const BillingDashboardWorkspace = lazyWorkspace(() =>
  loadBillingDashboardModule().then((module) => module.BillingDashboardWorkspace)
);
const CustomerStatementWorkspace = lazyWorkspace(() =>
  loadBillingReportsModule().then((module) => module.CustomerStatementWorkspace)
);
const SupplierStatementWorkspace = lazyWorkspace(() =>
  loadBillingReportsModule().then((module) => module.SupplierStatementWorkspace)
);
const StockStatementWorkspace = lazyWorkspace(() =>
  loadBillingReportsModule().then((module) => module.StockStatementWorkspace)
);
const GstStatementWorkspace = lazyWorkspace(() =>
  loadBillingReportsModule().then((module) => module.GstStatementWorkspace)
);
const BillingSettingsWorkspace = lazyWorkspace(() =>
  import("@cxapp/billing-web").then((module) => module.BillingSettingsWorkspace)
);
const DocumentSettingsWorkspace = lazyWorkspace(() =>
  import("@cxapp/billing-web").then((module) => module.DocumentSettingsWorkspace)
);
const PurchaseWorkspace = lazyWorkspace(() =>
  loadPurchaseModule().then((module) => module.PurchaseWorkspace)
);
const PurchasePrintRoutePage = lazyWorkspace(() =>
  loadPurchaseModule().then((module) => module.PurchasePrintRoutePage)
);
const ExportSalesWorkspace = lazyWorkspace(() =>
  loadExportSalesModule().then((module) => module.ExportSalesWorkspace)
);
const ExportSalesPrintRoutePage = lazyWorkspace(() =>
  loadExportSalesModule().then((module) => module.ExportSalesPrintRoutePage)
);
const PaymentWorkspace = lazyWorkspace(() =>
  loadPaymentModule().then((module) => module.PaymentWorkspace)
);
const ReceiptWorkspace = lazyWorkspace(() =>
  loadReceiptModule().then((module) => module.ReceiptWorkspace)
);
const MailWorkspace = lazyWorkspace(() =>
  import("@cxapp/mail-web/modules/mail").then((module) => module.MailWorkspace)
);
const AccountsOverviewWorkspace = lazyWorkspace(() =>
  loadAccountsOverviewModule().then((module) => module.AccountsOverviewWorkspace)
);
const AccountingWorkspace = lazyWorkspace(() =>
  loadAccountingModule().then((module) => module.AccountingWorkspace)
);
const AccountingLedgerWorkspace = lazyWorkspace(() =>
  loadAccountingModule().then((module) => module.AccountingLedgerWorkspace)
);
const AccountingPeriodsWorkspace = lazyWorkspace(() =>
  loadAccountingModule().then((module) => module.AccountingPeriodsWorkspace)
);
const CashBookWorkspace = lazyWorkspace(() =>
  loadAccountingModule().then((module) => module.CashBookWorkspace)
);
const BankBookWorkspace = lazyWorkspace(() =>
  loadAccountingModule().then((module) => module.BankBookWorkspace)
);
const BlogsEditorWorkspace = lazyWorkspace(() =>
  loadBlogModule().then((module) => module.BlogsEditorWorkspace)
);

const TenantUserWorkspace = lazy(() =>
  import("../../modules/tenant-user").then((module) => ({ default: module.TenantUserWorkspace }))
);
const TenantRoleWorkspace = lazy(() =>
  import("../../modules/tenant-role").then((module) => ({ default: module.TenantRoleWorkspace }))
);
const TenantPermissionWorkspace = lazy(() =>
  import("../../modules/tenant-permission").then((module) => ({
    default: module.TenantPermissionWorkspace
  }))
);
const TenantUserRoleWorkspace = lazy(() =>
  import("../../modules/tenant-user-role").then((module) => ({
    default: module.TenantUserRoleWorkspace
  }))
);
const TenantRolePermissionWorkspace = lazy(() =>
  import("../../modules/tenant-role-permission").then((module) => ({
    default: module.TenantRolePermissionWorkspace
  }))
);

type AppPage =
  | "auditor.overview"
  | "blog.overview"
  | "blog.articles"
  | "application.overview"
  | "application.landing"
  | "application.profile"
  | "application.settings"
  | "application.access.users"
  | "application.access.roles"
  | "application.access.permissions"
  | "application.access.user-roles"
  | "application.access.role-permissions"
  | "billing.overview"
  | "billing.quotation"
  | "billing.quotation.print"
  | "billing.sales"
  | "billing.sales.print"
  | "billing.purchase"
  | "billing.purchase.print"
  | "billing.export-sales"
  | "billing.export-sales.print"
  | "billing.payment"
  | "billing.receipt"
  | "billing.reports.customer-statement"
  | "billing.reports.supplier-statement"
  | "billing.reports.stock-statement"
  | "billing.reports.gst-statement"
  | "billing.settings"
  | "billing.document-settings"
  | "accounts.overview"
  | "accounts.ledger-groups"
  | "accounts.ledgers"
  | "accounts.journal"
  | "accounts.ledger"
  | "accounts.periods"
  | "accounts.cash-book"
  | "accounts.bank-book"
  | "mail.inbox"
  | "mail.outbox"
  | "mail.drafts"
  | "mail.scheduled"
  | "mail.sent"
  | "mail.failed"
  | "mail.trash"
  | "task-manager.overview"
  | "task-manager.todos"
  | "core.common.location.countries"
  | "core.common.location.states"
  | "core.common.location.districts"
  | "core.common.location.cities"
  | "core.common.location.pincodes"
  | "core.organisation.company"
  | "core.organisation.financial-year"
  | "core.organisation.default-company"
  | "core.master.contact"
  | "core.master.product"
  | "core.master.work-order"
  | `core.common.${"accounts" | "contacts" | "others" | "products" | "workorder"}.${string}`;
export function AppDesk() {
  const queryClient = useQueryClient();
  const signedInUser = signedInTenantUser();
  const [page, setPage] = useState<AppPage>(() => pageFromUrl(null));
  const [workspaceResetKey, setWorkspaceResetKey] = useState(0);
  const [hasUnsavedFormChanges, setHasUnsavedFormChanges] = useState(false);
  const [pendingListPage, setPendingListPage] = useState<AppPage | null>(null);
  const workspaceContentRef = useRef<HTMLElement | null>(null);
  const [shouldResolveLandingPath, setShouldResolveLandingPath] = useState(() => isAppRootPath());
  const runtimeQuery = useQuery({
    queryFn: getTenantRuntime,
    queryKey: ["tenant", "runtime"],
    staleTime: 5 * 60 * 1_000
  });
  const companiesQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: () => listCompanies(),
    queryKey: ["core", "organisation", "companies", runtimeQuery.data?.tenant?.uuid],
    staleTime: 5 * 60 * 1_000
  });
  const financialYearsQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: listFinancialYears,
    queryKey: ["core", "organisation", "financial-years", runtimeQuery.data?.tenant?.uuid],
    staleTime: 5 * 60 * 1_000
  });
  const defaultCompanyQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: getDefaultCompany,
    queryKey: [...defaultCompanyQueryKey, runtimeQuery.data?.tenant?.uuid],
    staleTime: 5 * 60 * 1_000
  });
  const [companyContextId, setCompanyContextId] = useState<number | null>(null);
  const [financialYearContextId, setFinancialYearContextId] = useState<number | null>(null);
  const runtime = runtimeQuery.data;
  const moduleKeys = runtime?.tenant?.enabledModuleKeys ?? ["platform.application"];
  const enabledApps = enabledAppIds(moduleKeys);
  const switchableApps = uniqueApps(enabledApps);
  const activeDefaultCompany =
    defaultCompanyQuery.data?.status === "active" ? defaultCompanyQuery.data : null;
  const persistedLandingApp = activeDefaultCompany?.landingApp as PlatformAppId | undefined;
  const landingApp =
    persistedLandingApp && enabledApps.includes(persistedLandingApp)
      ? persistedLandingApp
      : "application";
  const activeApp = appFromPage(page, landingApp, switchableApps);
  const activeCompanies = useMemo(
    () => (companiesQuery.data ?? []).filter((company) => company.isActive),
    [companiesQuery.data]
  );
  const selectedCompany =
    activeCompanies.find((company) => company.id === activeDefaultCompany?.companyId) ?? null;
  const companyBranding = useCompanyBranding(selectedCompany?.id ?? null);
  const activeFinancialYears = useMemo(
    () => (financialYearsQuery.data ?? []).filter((year) => year.status === "active"),
    [financialYearsQuery.data]
  );
  const selectedFinancialYear =
    activeFinancialYears.find((year) => year.id === activeDefaultCompany?.financialYearId) ?? null;
  const billingSettingsQuery = useQuery({
    enabled:
      activeApp === "billing" && enabledApps.includes("billing") && Boolean(companyContextId),
    queryFn: async () => {
      const module = await import("@cxapp/billing-web/modules/settings/services");
      return module.getBillingSettings();
    },
    queryKey: ["billing", "settings", companyContextId],
    staleTime: 5 * 60 * 1_000
  });
  const appSafePage = page.startsWith("devkit")
    ? pageForApp(landingApp)
    : page.startsWith("blog") && !switchableApps.includes("blog")
      ? pageForApp(landingApp)
      : page.startsWith("accounts") && !switchableApps.includes("accounts")
          ? pageForApp(landingApp)
          : (page.startsWith("billing") ||
                (page.startsWith("core") && !page.startsWith("core.organisation"))) &&
              !switchableApps.includes("billing")
          ? pageForApp(landingApp)
            : page;
  const safePage = resolveBillingFeaturePage(appSafePage, billingSettingsQuery.data?.features);
  const activePageTitle = titleForPage(safePage);
  const accountingYear = selectedFinancialYear?.name ?? "Accounting year";
  const defaultSelectionMutation = useMutation({
    mutationFn: saveDefaultCompany,
    onSuccess: async (record) => {
      publishCompanyContext(record.companyId);
      publishAccountingYear(record.financialYearId);
      await queryClient.invalidateQueries({ queryKey: defaultCompanyQueryKey });
      toast.success("Startup defaults updated");
    },
    onError: (error) =>
      toast.error("Startup defaults could not be updated", {
        description: error instanceof Error ? error.message : "Update failed."
      })
  });

  useEffect(() => {
    setPlatformDocumentTitle(activePageTitle);
  }, [activePageTitle]);

  useEffect(() => {
    if (activeApp !== "billing") return;

    const preload = () => {
      void Promise.allSettled(billingWorkspacePreloaders.map((loader) => loader()));
    };

    if ("requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(preload, { timeout: 2_000 });
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = setTimeout(preload, 750);
    return () => clearTimeout(timeoutId);
  }, [activeApp]);

  useEffect(() => {
    if (!isBillingFeaturePageDisabled(page, billingSettingsQuery.data?.features)) return;
    const fallbackPage: AppPage = "billing.overview";
    setPage(fallbackPage);
    window.history.replaceState(
      { page: fallbackPage },
      "",
      `/app/${fallbackPage.replaceAll(".", "/")}`
    );
  }, [billingSettingsQuery.data?.features, page]);

  useEffect(() => {
    if (!selectedCompany) {
      setCompanyContextId(null);
      return;
    }
    publishCompanyContext(selectedCompany.id);
    setCompanyContextId(selectedCompany.id);
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedFinancialYear) {
      setFinancialYearContextId(null);
      return;
    }
    publishAccountingYear(selectedFinancialYear.id);
    setFinancialYearContextId(selectedFinancialYear.id);
  }, [selectedFinancialYear]);

  useEffect(() => {
    const tenant = runtime?.tenant;
    if (!tenant?.corporateId || !defaultCompanyQuery.isFetched) return;

    publishDesktopWorkspace({
      companyId: activeDefaultCompany?.companyId ?? null,
      companyName: activeDefaultCompany?.companyName ?? null,
      corporateId: tenant.corporateId,
      financialYearId: activeDefaultCompany?.financialYearId ?? null,
      financialYearName: activeDefaultCompany?.financialYearName ?? null,
      landingPage: `/app/${pageForApp(landingApp).replaceAll(".", "/")}`,
      tenantCode: tenant.tenantCode,
      tenantName: tenant.tenantName,
      tenantUuid: tenant.uuid
    });
  }, [activeDefaultCompany, defaultCompanyQuery.isFetched, landingApp, runtime?.tenant]);

  useEffect(() => {
    if (!shouldResolveLandingPath) return;
    if (runtimeQuery.isLoading || !defaultCompanyQuery.isFetched) return;

    const landingPage = pageForApp(landingApp);
    setPage(landingPage);
    setShouldResolveLandingPath(false);
    window.history.replaceState({ page: landingPage }, "", `/app/${landingPage.replace(".", "/")}`);
    setPlatformDocumentTitle(titleForPage(landingPage));
  }, [defaultCompanyQuery.isFetched, landingApp, runtimeQuery.isLoading, shouldResolveLandingPath]);

  function selectPage(nextPage: AppPage) {
    const allowedPage = resolveBillingFeaturePage(nextPage, billingSettingsQuery.data?.features);
    startTransition(() => setPage(allowedPage));
    window.history.pushState({ page: allowedPage }, "", `/app/${allowedPage.replaceAll(".", "/")}`);
    setPlatformDocumentTitle(titleForPage(allowedPage));
  }

  function completeListNavigation(nextPage: AppPage) {
    const allowedPage = resolveBillingFeaturePage(nextPage, billingSettingsQuery.data?.features);
    setHasUnsavedFormChanges(false);
    setPendingListPage(null);
    startTransition(() => {
      setPage(allowedPage);
      setWorkspaceResetKey((current) => current + 1);
    });
    window.history.pushState({ page: allowedPage }, "", `/app/${allowedPage.replaceAll(".", "/")}`);
    setPlatformDocumentTitle(titleForPage(allowedPage));
  }

  function requestListNavigation(nextPage: AppPage) {
    const hasActiveDraftForm = Boolean(
      workspaceContentRef.current?.querySelector("form, [data-cxapp-draft-form]")
    );
    if (hasUnsavedFormChanges && hasActiveDraftForm) {
      setPendingListPage(nextPage);
      return;
    }
    completeListNavigation(nextPage);
  }

  function markUnsavedFormChanges(event: FormEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("form, [data-cxapp-draft-form]")) {
      setHasUnsavedFormChanges(true);
    }
  }

  function selectBillingRecord(nextPage: AppPage, recordId: string) {
    const allowedPage = resolveBillingFeaturePage(nextPage, billingSettingsQuery.data?.features);
    startTransition(() => setPage(allowedPage));
    window.history.pushState(
      { page: allowedPage, recordId },
      "",
      allowedPage === nextPage
        ? `/app/${allowedPage.replaceAll(".", "/")}?record=${encodeURIComponent(recordId)}`
        : `/app/${allowedPage.replaceAll(".", "/")}`
    );
    setPlatformDocumentTitle(titleForPage(allowedPage));
  }

  function publishLandingApp(nextLandingApp: PlatformAppId) {
    if (!activeDefaultCompany) return;
    defaultSelectionMutation.mutate({
      companyId: activeDefaultCompany.companyId,
      financialYearId: activeDefaultCompany.financialYearId,
      landingApp: nextLandingApp,
      status: "active"
    });
  }

  async function handleLogout() {
    await logout("tenant");
    window.location.assign("/login");
  }

  function updateGlobalDefault(companyId: number, financialYearId: number) {
    defaultSelectionMutation.mutate({
      companyId,
      financialYearId,
      landingApp,
      status: "active"
    });
  }

  const activeWorkspaceTitle =
    platformAppRegistry.find((app) => app.id === activeApp)?.label ?? "Application";
  const menuItems = appMenuItemsFor(
    activeApp,
    safePage,
    (nextPage) => requestListNavigation(nextPage as AppPage),
    billingSettingsQuery.data?.features
  );
  const workspaceItems = appWorkspaceItems(switchableApps, activeApp).map((item) => ({
    ...item,
    onSelect: () => requestListNavigation(pageForApp(item.appId))
  }));

  const contextError =
    !defaultCompanyQuery.isLoading && runtime?.tenant && !activeDefaultCompany
      ? new Error("Configure an active Default Company before opening the tenant workspace.")
      : !companiesQuery.isLoading && runtime?.tenant && !selectedCompany
        ? new Error("No active company is available for this tenant.")
        : !financialYearsQuery.isLoading && runtime?.tenant && !selectedFinancialYear
          ? new Error("No active financial year is available for this tenant.")
          : null;

  const bootstrapLoading =
    runtimeQuery.isLoading ||
    companiesQuery.isLoading ||
    financialYearsQuery.isLoading ||
    defaultCompanyQuery.isLoading ||
    (!companyContextId && !contextError) ||
    (!financialYearContextId && !contextError) ||
    (activeApp === "billing" && billingSettingsQuery.isLoading);
  const bootstrapError =
    runtimeQuery.error ??
    companiesQuery.error ??
    financialYearsQuery.error ??
    defaultCompanyQuery.error ??
    (activeApp === "billing" ? billingSettingsQuery.error : null) ??
    contextError;

  if (bootstrapError) {
    return (
      <AuthGate desk="tenant">
        <TenantBootstrapErrorScreen error={bootstrapError} />
      </AuthGate>
    );
  }

  if (bootstrapLoading) {
    return (
      <AuthGate desk="tenant">
        <GlobalLoader />
      </AuthGate>
    );
  }

  return (
    <AuthGate desk="tenant">
      <ApplicationLayout
        brand={{
          href: appRootUrl(activeApp),
          ...(companyBranding.lightLogoUrl ? { logoSrc: companyBranding.lightLogoUrl } : {}),
          ...(companyBranding.darkLogoUrl ? { logoDarkSrc: companyBranding.darkLogoUrl } : {}),
          logoAlt: `${companyBranding.brandName ?? "Company"} logo`,
          options: activeCompanies.map((company) => ({
            id: String(company.id),
            subtitle: accountingYear,
            title: companyBrandName(company)
          })),
          optionsLabel: "Company",
          onOptionSelect: (id) => {
            if (!selectedFinancialYear) return;
            updateGlobalDefault(Number(id), selectedFinancialYear.id);
          },
          onSecondaryOptionSelect: (id) => {
            if (!selectedCompany) return;
            updateGlobalDefault(selectedCompany.id, Number(id));
          },
          ...(selectedCompany ? { selectedOptionId: String(selectedCompany.id) } : {}),
          ...(selectedFinancialYear
            ? { selectedSecondaryOptionId: String(selectedFinancialYear.id) }
            : {}),
          secondaryOptions: activeFinancialYears.map((year) => ({
            id: String(year.id),
            title: year.name
          })),
          secondaryOptionsLabel: "Financial year",
          subtitle: selectedFinancialYear
            ? selectedFinancialYear.name
            : `${activeWorkspaceTitle.toLowerCase()} workspace`,
          title: companyBranding.brandName ?? activeWorkspaceTitle
        }}
        headerTitle={activePageTitle}
        homeHref="/"
        menuItems={menuItems}
        onLogout={handleLogout}
        subtitle={null}
        title={null}
        user={signedInUser}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={workspaceItems}
      >
        <main
          ref={workspaceContentRef}
          className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5"
          onChangeCapture={markUnsavedFormChanges}
        >
          <Suspense
            key={`${safePage}:${workspaceResetKey}`}
            fallback={<GlobalLoader className="min-h-[32rem]" fullScreen={false} />}
          >
            {safePage === "blog.overview" || safePage === "blog.articles" ? (
              <BlogsEditorWorkspace host={blogEditorHost} />
            ) : null}
            {safePage === "auditor.overview" ? <AuditorOverviewWorkspace /> : null}
            {safePage === "application.overview" ? (
              <ApplicationOverview signedInUser={signedInUser} />
            ) : null}
            {safePage === "application.landing" ? (
              <LandingDesk
                enabledApps={enabledApps}
                landingApp={landingApp}
                onPublish={publishLandingApp}
                saving={defaultSelectionMutation.isPending}
              />
            ) : null}
            {safePage === "application.profile" ? <ApplicationProfile /> : null}
            {safePage === "application.settings" ? <ApplicationSettings /> : null}
            {safePage === "application.access.users" ? <TenantUserWorkspace /> : null}
            {safePage === "application.access.roles" ? <TenantRoleWorkspace /> : null}
            {safePage === "application.access.permissions" ? <TenantPermissionWorkspace /> : null}
            {safePage === "application.access.user-roles" ? <TenantUserRoleWorkspace /> : null}
            {safePage === "application.access.role-permissions" ? (
              <TenantRolePermissionWorkspace />
            ) : null}
            {safePage === "billing.overview" ? (
              <BillingOverview onNavigate={selectPage} onNavigateToRecord={selectBillingRecord} />
            ) : null}
            {safePage === "billing.quotation" ? <QuotationWorkspace /> : null}
            {safePage === "billing.quotation.print" ? <QuotationPrintRoutePage /> : null}
            {safePage === "billing.sales" ? (
              <BillingSales initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "billing.sales.print" ? <SalesPrintRoutePage /> : null}
            {safePage === "billing.purchase" ? (
              <PurchaseWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "billing.purchase.print" ? <PurchasePrintRoutePage /> : null}
            {safePage === "billing.export-sales" ? (
              <ExportSalesWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "billing.export-sales.print" ? <ExportSalesPrintRoutePage /> : null}
            {safePage === "billing.payment" ? (
              <PaymentWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "billing.receipt" ? (
              <ReceiptWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "billing.reports.customer-statement" ? (
              <CustomerStatementWorkspace />
            ) : null}
            {safePage === "billing.reports.supplier-statement" ? (
              <SupplierStatementWorkspace />
            ) : null}
            {safePage === "billing.reports.stock-statement" ? <StockStatementWorkspace /> : null}
            {safePage === "billing.reports.gst-statement" ? <GstStatementWorkspace /> : null}
            {safePage === "billing.settings" ? <BillingSettingsWorkspace /> : null}
            {safePage === "billing.document-settings" ? <DocumentSettingsWorkspace /> : null}
            {safePage === "accounts.overview" ? <AccountsOverviewWorkspace /> : null}
            {safePage === "accounts.ledger-groups" ? <LedgerGroupsWorkspace /> : null}
            {safePage === "accounts.ledgers" ? <LedgersWorkspace /> : null}
            {safePage === "accounts.journal" ? (
              <AccountingWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "accounts.ledger" ? (
              <AccountingLedgerWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "accounts.periods" ? (
              <AccountingPeriodsWorkspace initialRecordId={recordIdFromUrl()} />
            ) : null}
            {safePage === "accounts.cash-book" ? <CashBookWorkspace /> : null}
            {safePage === "accounts.bank-book" ? <BankBookWorkspace /> : null}
            {safePage.startsWith("mail.") ? (
              <MailWorkspace mailbox={mailboxForPage(safePage)} />
            ) : null}
            {safePage === "task-manager.overview" || safePage === "task-manager.todos" ? (
              <TaskManagerWorkspace desk="tenant" />
            ) : null}
            {safePage === "core.organisation.company" ? <CompanyWorkspace /> : null}
            {safePage === "core.organisation.financial-year" ? <FinancialYearWorkspace /> : null}
            {safePage === "core.organisation.default-company" ? (
              <DefaultCompanyWorkspace
                landingApps={landingAppOptions(switchableApps)}
                onSaved={() => {
                  void defaultCompanyQuery.refetch();
                  void financialYearsQuery.refetch();
                }}
              />
            ) : null}
            {renderOwnedLocationPage(safePage)}
            {renderOwnedCommonMasterPage(safePage)}
            {safePage === "core.master.contact" ? <ContactWorkspace key={safePage} /> : null}
            {safePage === "core.master.product" ? <ProductWorkspace key={safePage} /> : null}
            {safePage === "core.master.work-order" ? <WorkOrderWorkspace key={safePage} /> : null}
          </Suspense>
        </main>
        <AlertDialog
          open={pendingListPage !== null}
          onOpenChange={(open) => {
            if (!open) setPendingListPage(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Your form changes have not been saved. Stay here to continue editing, or discard
                them and open the list page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay here</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingListPage) completeListNavigation(pendingListPage);
                }}
              >
                Discard and open list
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ApplicationLayout>
    </AuthGate>
  );
}

function TenantBootstrapErrorScreen({ error }: { error: unknown }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="text-base font-semibold">Application setup could not be loaded</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected setup error occurred."}
        </p>
      </div>
    </main>
  );
}

function landingAppOptions(apps: PlatformAppId[]): LandingAppOption[] {
  return apps.map((app) => ({
    label:
      app === "application"
        ? "Application"
        : app.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase()),
    value: app
  }));
}

function uniqueApps(apps: PlatformAppId[]) {
  return Array.from(new Set(["application" as PlatformAppId, ...apps]));
}

function pageFromUrl(landingApp: PlatformAppId | null): AppPage {
  const [, , app, ...children] = window.location.pathname.split("/");
  if (!app) return pageForApp(landingApp ?? "application");

  const key = `${app}.${children.filter(Boolean).join(".") || "overview"}`;
  if (
    key === "auditor.overview" ||
    key === "blog.overview" ||
    key === "blog.articles" ||
    key === "application.overview" ||
    key === "application.landing" ||
    key === "application.profile" ||
    key === "application.settings" ||
    key === "application.access.users" ||
    key === "application.access.roles" ||
    key === "application.access.permissions" ||
    key === "application.access.user-roles" ||
    key === "application.access.role-permissions" ||
    key === "billing.overview" ||
    key === "billing.quotation" ||
    key === "billing.quotation.print" ||
    key === "billing.desk" ||
    key === "billing.sales" ||
    key === "billing.sales.print" ||
    key === "billing.purchase" ||
    key === "billing.purchase.print" ||
    key === "billing.export-sales" ||
    key === "billing.export-sales.print" ||
    key === "billing.payment" ||
    key === "billing.receipt" ||
    key === "billing.reports.customer-statement" ||
    key === "billing.reports.supplier-statement" ||
    key === "billing.reports.stock-statement" ||
    key === "billing.reports.gst-statement" ||
    key === "billing.settings" ||
    key === "billing.document-settings" ||
    key === "accounts.overview" ||
    key === "accounts.ledger-groups" ||
    key === "accounts.ledgers" ||
    key === "accounts.journal" ||
    key === "accounts.ledger" ||
    key === "accounts.periods" ||
    key === "accounts.cash-book" ||
    key === "accounts.bank-book" ||
    key === "mail.inbox" ||
    key === "mail.outbox" ||
    key === "mail.drafts" ||
    key === "mail.scheduled" ||
    key === "mail.sent" ||
    key === "mail.failed" ||
    key === "mail.trash" ||
    key === "core.common.location.countries" ||
    key === "core.common.location.states" ||
    key === "core.common.location.districts" ||
    key === "core.common.location.cities" ||
    key === "core.common.location.pincodes" ||
    key === "core.organisation.company" ||
    key === "core.organisation.financial-year" ||
    key === "core.organisation.default-company" ||
    key === "core.master.contact" ||
    key === "core.master.product" ||
    key === "core.master.work-order" ||
    isCommonMasterPage(key)
  ) {
    return (key === "billing.desk" ? "billing.overview" : key) as AppPage;
  }
  if (key === "mail.overview") return "mail.inbox";
  return pageForApp(landingApp ?? "application");
}

function LandingDesk({
  enabledApps,
  landingApp,
  onPublish,
  saving
}: {
  enabledApps: PlatformAppId[];
  landingApp: PlatformAppId;
  onPublish: (app: PlatformAppId) => void;
  saving: boolean;
}) {
  const [draftLandingApp, setDraftLandingApp] = useState<PlatformAppId>(landingApp);
  const dirty = draftLandingApp !== landingApp;

  useEffect(() => {
    setDraftLandingApp(landingApp);
  }, [landingApp]);

  const choices = enabledApps.map((appId) => ({
    description:
      appId === "billing"
        ? "Sales, purchase, receipt, payment, report, master, common, and billing settings."
        : appId === "accounts"
          ? "Chart of accounts, ledger groups, ledgers, journal, and accounting overview."
          : appId === "mail"
            ? "Inbox, compose, scheduled delivery, sent history, failures, and mail settings."
            : "Shared workspace, company setup, roles, and cross-app launch desk.",
    icon:
      appId === "billing"
        ? CreditCardIcon
        : appId === "accounts"
          ? LayersIcon
          : appId === "mail"
            ? MailIcon
            : appId === "task-manager"
              ? ListChecksIcon
              : LayoutDashboardIcon,
    iconClass:
      appId === "billing"
        ? "bg-emerald-600 text-white"
        : appId === "accounts"
          ? "bg-cyan-600 text-white"
          : appId === "mail"
            ? "bg-sky-600 text-white"
            : appId === "task-manager"
              ? "bg-violet-600 text-white"
              : "bg-slate-950 text-white",
    id: appId,
    label:
      appId === "billing"
        ? "Billing"
        : appId === "accounts"
          ? "Accounts"
          : appId === "mail"
            ? "Mail"
            : appId === "task-manager"
              ? "Task Manager"
              : "Application"
  })) satisfies Array<{
    description: string;
    icon: typeof LayoutDashboardIcon;
    iconClass: string;
    id: PlatformAppId;
    label: string;
  }>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Landing Desk</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which enabled app opens first for this workspace.
          </p>
        </div>
        <Button
          disabled={!dirty || saving}
          icon={<RocketIcon />}
          onClick={() => onPublish(draftLandingApp)}
        >
          {saving ? "Publishing..." : "Publish live"}
        </Button>
      </div>

      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Default landing app</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only enabled apps are available as landing choices.
            </p>
          </div>
          <StatusBadge tone={dirty ? "amber" : "green"}>
            {dirty ? "Draft not live" : "Live"}
          </StatusBadge>
        </div>

        <RadioGroup
          value={draftLandingApp}
          onValueChange={(value) => setDraftLandingApp(value as PlatformAppId)}
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {choices.map((choice) => {
            const Icon = choice.icon;
            const selected = draftLandingApp === choice.id;

            return (
              <Label
                key={choice.id}
                className={`flex min-h-[98px] cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
                  selected ? "border-border bg-muted/70" : "bg-background hover:bg-muted/35"
                }`}
              >
                <RadioGroupItem value={choice.id} className="mt-1" />
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md ${choice.iconClass}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{choice.label}</span>
                  </span>
                  <span className="mt-2 block text-sm font-normal leading-5 text-muted-foreground">
                    {choice.description}
                  </span>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>
    </section>
  );
}

function ApplicationOverview({
  signedInUser
}: {
  signedInUser: ReturnType<typeof signedInTenantUser>;
}) {
  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="relative min-h-36 p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-indigo-100 via-sky-50 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-slate-950 text-white shadow-sm">
                <LayoutDashboardIcon className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Application</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-normal">Application Desk</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Tenant application workspace for landing setup, platform profile, settings, users,
                  and access.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
              <UserRoundIcon className="size-4" />
              <span>
                Signed in as {signedInUser.name} · {signedInUser.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ApplicationDetailCard
          caption="Default workspace selection"
          icon={RocketIcon}
          iconClassName="bg-slate-950 text-white"
          statusTone="green"
          title="Landing Desk"
          value="Configured"
        />
        <ApplicationDetailCard
          caption="Tenant identity and context"
          icon={Building2Icon}
          iconClassName="bg-sky-600 text-white"
          statusTone="green"
          title="Platform Profile"
          value="Active"
        />
        <ApplicationDetailCard
          caption="Tenant-scoped controls"
          icon={Settings2Icon}
          iconClassName="bg-amber-500 text-white"
          statusTone="blue"
          title="Settings"
          value="Ready"
        />
        <ApplicationDetailCard
          caption="Application and billing desks"
          icon={ShieldCheckIcon}
          iconClassName="bg-emerald-600 text-white"
          statusTone="green"
          title="App Access"
          value="2 areas"
        />
      </div>

      <div className="rounded-md border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-normal">Application Menu</h2>
          <StatusBadge tone="green">Ready</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ApplicationShortcut
            description="Choose which enabled app opens first for this workspace."
            icon={LayoutDashboardIcon}
            title="Landing Desk"
          />
          <ApplicationShortcut
            description="Review application identity and tenant workspace context."
            icon={Building2Icon}
            title="Platform Profile"
          />
          <ApplicationShortcut
            description="Manage tenant-scoped application settings and access controls."
            icon={Settings2Icon}
            title="Settings"
          />
        </div>
      </div>
    </section>
  );
}

function ApplicationDetailCard({
  caption,
  icon: Icon,
  iconClassName,
  statusTone,
  title,
  value
}: {
  caption: string;
  icon: typeof LayoutDashboardIcon;
  iconClassName: string;
  statusTone: "blue" | "green";
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-md ${iconClassName}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <div className="mt-7 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{caption}</span>
        <StatusBadge tone={statusTone}>Enabled</StatusBadge>
      </div>
    </div>
  );
}

function ApplicationShortcut({
  description,
  icon: Icon,
  title
}: {
  description: string;
  icon: typeof LayoutDashboardIcon;
  title: string;
}) {
  return (
    <div className="flex min-h-28 items-start gap-3 rounded-md border bg-background p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ApplicationProfile() {
  return (
    <Card
      title="Application Profile"
      description="Platform identity, workspace access, and tenant context."
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="green">Always enabled</StatusBadge>
      </div>
    </Card>
  );
}

function ApplicationSettings() {
  return (
    <Card title="Application Settings" description="Tenant-scoped platform settings.">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="green">Platform</StatusBadge>
      </div>
    </Card>
  );
}

function BillingSales({ initialRecordId }: { initialRecordId?: string | undefined }) {
  return <SalesWorkspace initialRecordId={initialRecordId} />;
}

function BillingOverview({
  onNavigate,
  onNavigateToRecord
}: {
  onNavigate: (page: AppPage) => void;
  onNavigateToRecord: (page: AppPage, recordId: string) => void;
}) {
  const pages = {
    payment: "billing.payment",
    purchase: "billing.purchase",
    receipt: "billing.receipt",
    sales: "billing.sales"
  } as const;
  return (
    <BillingDashboardWorkspace
      onNavigate={(target) => onNavigate(pages[target])}
      onNavigateToRecord={(target) => {
        const page =
          target.kind === "export-sales"
            ? "billing.export-sales"
            : pages[target.kind as keyof typeof pages];
        if (page) onNavigateToRecord(page, target.documentId);
      }}
    />
  );
}

function recordIdFromUrl() {
  return new URLSearchParams(window.location.search).get("record") || undefined;
}

function isBillingFeaturePageDisabled(
  page: AppPage,
  features: BillingNavigationFeatures | undefined
) {
  if (!features) return false;
  if (page.startsWith("billing.quotation")) return !features.quotation;
  if (page.startsWith("billing.export-sales")) return !features.exportSales;
  return false;
}

function resolveBillingFeaturePage(
  page: AppPage,
  features: BillingNavigationFeatures | undefined
): AppPage {
  return isBillingFeaturePageDisabled(page, features) ? "billing.overview" : page;
}

function signedInTenantUser() {
  const identity = getSessionIdentity();
  const email = identity?.email || "user@codexsun.app";
  const name = identity?.name || email.split("@")[0] || "User";
  return {
    email,
    fallback: userInitials(name),
    name
  };
}

function userInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "U";
}

function renderOwnedLocationPage(page: AppPage) {
  if (page === "core.common.location.countries") return <CountryWorkspace />;
  if (page === "core.common.location.states") return <StateWorkspace />;
  if (page === "core.common.location.districts") return <DistrictWorkspace />;
  if (page === "core.common.location.cities") return <CityWorkspace />;
  if (page === "core.common.location.pincodes") return <PincodeWorkspace />;
  return null;
}

function renderOwnedCommonMasterPage(page: AppPage) {
  if (page === "core.common.accounts.ledger-groups") return <LedgerGroupsWorkspace />;
  if (page === "core.common.accounts.ledgers") return <LedgersWorkspace />;
  if (page === "core.common.contacts.contact-groups") return <ContactGroupsWorkspace />;
  if (page === "core.common.contacts.contact-types") return <ContactTypesWorkspace />;
  if (page === "core.common.contacts.address-types") return <AddressTypesWorkspace />;
  if (page === "core.common.contacts.bank-names") return <BankNamesWorkspace />;
  if (page === "core.common.products.product-groups") return <ProductGroupsWorkspace />;
  if (page === "core.common.products.product-categories") return <ProductCategoriesWorkspace />;
  if (page === "core.common.products.product-types") return <ProductTypesWorkspace />;
  if (page === "core.common.products.units") return <UnitsWorkspace />;
  if (page === "core.common.products.hsn-codes") return <HsnCodesWorkspace />;
  if (page === "core.common.products.taxes") return <TaxesWorkspace />;
  if (page === "core.common.products.brands") return <BrandsWorkspace />;
  if (page === "core.common.products.colours") return <ColoursWorkspace />;
  if (page === "core.common.products.sizes") return <SizesWorkspace />;
  if (page === "core.common.products.styles") return <StylesWorkspace />;
  if (page === "core.common.workorder.work-order-types") return <WorkOrderTypesWorkspace />;
  if (page === "core.common.workorder.transports") return <TransportsWorkspace />;
  if (page === "core.common.workorder.warehouses") return <WarehousesWorkspace />;
  if (page === "core.common.workorder.destinations") return <DestinationsWorkspace />;
  if (page === "core.common.workorder.stock-rejection-types")
    return <StockRejectionTypesWorkspace />;
  if (page === "core.common.others.currencies") return <CurrenciesWorkspace />;
  if (page === "core.common.others.priorities") return <PrioritiesWorkspace />;
  if (page === "core.common.others.payment-terms") return <PaymentTermsWorkspace />;
  if (page === "core.common.others.sales-types") return <SalesTypesWorkspace />;
  if (page === "core.common.others.months") return <MonthsWorkspace />;
  return null;
}

function titleForPage(page: AppPage) {
  const labels: Partial<Record<AppPage, string>> = {
    "auditor.overview": "Overview",
    "blog.overview": "Dashboard",
    "blog.articles": "Articles",
    "application.overview": "Overview",
    "application.landing": "Landing Desk",
    "application.profile": "Application Profile",
    "application.settings": "Application Settings",
    "application.access.users": "Users",
    "application.access.roles": "Roles",
    "application.access.permissions": "Permissions",
    "application.access.user-roles": "User Roles",
    "application.access.role-permissions": "Role Permissions",
    "billing.overview": "Overview",
    "billing.quotation": "Quotation",
    "billing.sales": "Sales",
    "billing.purchase": "Purchase",
    "billing.export-sales": "Export Sales",
    "billing.payment": "Payment",
    "billing.receipt": "Receipt",
    "billing.reports.customer-statement": "Customer Statement",
    "billing.reports.supplier-statement": "Supplier Statement",
    "billing.reports.stock-statement": "Stock Statement",
    "billing.reports.gst-statement": "GST Statement",
    "billing.settings": "Billing Settings",
    "billing.document-settings": "Document Settings",
    "accounts.overview": "Overview",
    "accounts.ledger-groups": "Ledger Groups",
    "accounts.ledgers": "Ledgers",
    "accounts.journal": "Journals",
    "accounts.ledger": "Ledger",
    "accounts.periods": "Accounting Periods",
    "accounts.cash-book": "Cash Book",
    "accounts.bank-book": "Bank Book",
    "mail.inbox": "Inbox",
    "mail.outbox": "Outbox",
    "mail.drafts": "Drafts",
    "mail.scheduled": "Scheduled",
    "mail.sent": "Sent",
    "mail.failed": "Failed",
    "mail.trash": "Trash",
    "task-manager.overview": "Task Manager",
    "task-manager.todos": "Todo",
    "core.common.location.cities": "Cities",
    "core.common.location.countries": "Countries",
    "core.common.location.districts": "Districts",
    "core.common.location.pincodes": "Pincodes",
    "core.common.location.states": "States",
    "core.common.contacts.address-types": "Address Types",
    "core.common.contacts.bank-names": "Bank Names",
    "core.common.contacts.contact-groups": "Contact Groups",
    "core.common.contacts.contact-types": "Contact Types",
    "core.common.accounts.ledger-groups": "Ledger Groups",
    "core.common.accounts.ledgers": "Ledgers",
    "core.common.others.currencies": "Currencies",
    "core.common.others.months": "Months",
    "core.common.others.payment-terms": "Payment Terms",
    "core.common.others.priorities": "Priorities",
    "core.common.others.sales-types": "Sales Types",
    "core.common.products.brands": "Brands",
    "core.common.products.colours": "Colours",
    "core.common.products.hsn-codes": "HSN Codes",
    "core.common.products.product-categories": "Product Categories",
    "core.common.products.product-groups": "Product Groups",
    "core.common.products.product-types": "Product Types",
    "core.common.products.sizes": "Sizes",
    "core.common.products.styles": "Styles",
    "core.common.products.taxes": "Taxes",
    "core.common.products.units": "Units",
    "core.common.workorder.destinations": "Destinations",
    "core.common.workorder.stock-rejection-types": "Stock Rejection Types",
    "core.common.workorder.transports": "Transports",
    "core.common.workorder.warehouses": "Warehouses",
    "core.common.workorder.work-order-types": "Work Order Types",
    "core.organisation.company": "Company",
    "core.organisation.financial-year": "Financial Years",
    "core.organisation.default-company": "Default Company",
    "core.master.contact": "Contact",
    "core.master.product": "Product",
    "core.master.work-order": "Work Order"
  };
  return labels[page] ?? "Application";
}

function isCommonMasterPage(page: string): page is AppPage {
  return COMMON_MASTER_PAGES.has(page);
}

const COMMON_MASTER_PAGES = new Set<string>([
  "core.common.accounts.ledger-groups",
  "core.common.accounts.ledgers",
  "core.common.contacts.address-types",
  "core.common.contacts.bank-names",
  "core.common.contacts.contact-groups",
  "core.common.contacts.contact-types",
  "core.common.others.currencies",
  "core.common.others.months",
  "core.common.others.payment-terms",
  "core.common.others.priorities",
  "core.common.others.sales-types",
  "core.common.products.brands",
  "core.common.products.colours",
  "core.common.products.hsn-codes",
  "core.common.products.product-categories",
  "core.common.products.product-groups",
  "core.common.products.product-types",
  "core.common.products.sizes",
  "core.common.products.styles",
  "core.common.products.taxes",
  "core.common.products.units",
  "core.common.workorder.destinations",
  "core.common.workorder.stock-rejection-types",
  "core.common.workorder.transports",
  "core.common.workorder.warehouses",
  "core.common.workorder.work-order-types"
]);

function appFromPage(
  page: AppPage,
  landingApp: PlatformAppId,
  enabledApps: PlatformAppId[]
): PlatformAppId {
  if (page.startsWith("auditor"))
    return enabledApps.includes("auditor") ? "auditor" : landingApp;
  if (page.startsWith("blog")) return enabledApps.includes("blog") ? "blog" : landingApp;
  if (page.startsWith("core.organisation")) return "application";
  if (page.startsWith("billing") || page.startsWith("core"))
    return enabledApps.includes("billing") ? "billing" : landingApp;
  if (page.startsWith("task-manager"))
    return enabledApps.includes("task-manager") ? "task-manager" : landingApp;
  if (page.startsWith("accounts"))
    return enabledApps.includes("accounts") ? "accounts" : landingApp;
  if (page.startsWith("devkit")) return landingApp;
  if (page.startsWith("mail")) return enabledApps.includes("mail") ? "mail" : landingApp;
  return "application";
}

function mailboxForPage(page: AppPage) {
  const mailbox = page.startsWith("mail.") ? page.slice("mail.".length) : "inbox";
  return mailbox === "outbox" ||
    mailbox === "drafts" ||
    mailbox === "scheduled" ||
    mailbox === "sent" ||
    mailbox === "failed" ||
    mailbox === "trash"
    ? mailbox
    : "inbox";
}

function pageForApp(app: PlatformAppId): AppPage {
  return appRootPage(app);
}

function isAppRootPath() {
  return window.location.pathname === "/app" || window.location.pathname === "/app/";
}
