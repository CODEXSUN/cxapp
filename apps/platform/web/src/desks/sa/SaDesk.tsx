import { lazy, Suspense, useState, type ComponentType } from "react";
import {
  AppWindowIcon,
  Building2Icon,
  CircleGaugeIcon,
  CreditCardIcon,
  DatabaseIcon,
  ListChecksIcon,
  PaletteIcon,
  ShieldCheckIcon
} from "lucide-react";
import { SuperLayout } from "@codexsun/ui/layouts/super-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { AppOperationsStrip, useAppOperationsQuery } from "../../modules/app-orchestration";
import type { OrchestratedAppId } from "../../modules/app-orchestration";
import { logout } from "../../shared/api/platform-api";
import { AuthGate } from "../../shared/auth/AuthGate";

function lazyWorkspace<Props>(loader: () => Promise<ComponentType<Props>>) {
  return lazy(async () => ({ default: await loader() }));
}

const DesignSystemGallery = lazyWorkspace(() =>
  import("../../modules/design-system").then((module) => module.DesignSystemGallery)
);
const TenantList = lazyWorkspace(() =>
  import("../../modules/tenant").then((module) => module.TenantList)
);
const TenantDomainList = lazyWorkspace(() =>
  import("../../modules/tenant-domain").then((module) => module.TenantDomainList)
);
const PlanWorkspace = lazyWorkspace(() =>
  import("../../modules/plan").then((module) => module.PlanWorkspace)
);
const SubscriptionWorkspace = lazyWorkspace(() =>
  import("../../modules/subscription").then((module) => module.SubscriptionWorkspace)
);
const AppRegistryWorkspace = lazyWorkspace(() =>
  import("../../modules/app-registry").then((module) => module.AppRegistryWorkspace)
);
const IndustryWorkspace = lazyWorkspace(() =>
  import("../../modules/industry").then((module) => module.IndustryWorkspace)
);
const EntitlementWorkspace = lazyWorkspace(() =>
  import("../../modules/entitlement").then((module) => module.EntitlementWorkspace)
);
const PlanAccessWorkspace = lazyWorkspace(() =>
  import("../../modules/plan-access").then((module) => module.PlanAccessWorkspace)
);
const TenantAccessWorkspace = lazyWorkspace(() =>
  import("../../modules/tenant-access").then((module) => module.TenantAccessWorkspace)
);
const AccessControlWorkspace = lazyWorkspace(() =>
  import("../../modules/access-control").then((module) => module.AccessControlWorkspace)
);
const PlatformActivityWorkspace = lazyWorkspace(() =>
  import("../../modules/platform-activity").then((module) => module.PlatformActivityWorkspace)
);
const MasterDatabaseWorkspace = lazyWorkspace(() =>
  import("../../modules/master-database").then((module) => module.MasterDatabaseWorkspace)
);
const TenantDatabaseWorkspace = lazyWorkspace(() =>
  import("../../modules/tenant-database").then((module) => module.TenantDatabaseWorkspace)
);
const QueueManagementWorkspace = lazyWorkspace(() =>
  import("../../modules/queue-management").then((module) => module.QueueManagementWorkspace)
);
const StorageManagerWorkspace = lazyWorkspace(() =>
  import("../../modules/storage-manager").then((module) => module.StorageManagerWorkspace)
);
const TaskManagerWorkspace = lazyWorkspace(() =>
  import("../../modules/task-manager").then((module) => module.TaskManagerWorkspace)
);
const AppOrchestrationWorkspace = lazyWorkspace(() =>
  import("../../modules/app-orchestration/app-orchestration.workspace").then(
    (module) => module.AppOrchestrationWorkspace
  )
);

type SaPage =
  | "overview"
  | "app-operations"
  | "task-manager"
  | "tenants"
  | "domains"
  | "plans"
  | "plan-access"
  | "subscriptions"
  | "apps"
  | "entitlements"
  | "tenant-access"
  | "industries"
  | "master-database"
  | "tenant-database"
  | "queue-management"
  | "storage-manager"
  | "access"
  | "activity"
  | "design-system";

export function SaDesk() {
  const [page, setPage] = useState<SaPage>(pageFromUrl());
  const [selectedAppId, setSelectedAppId] = useState<OrchestratedAppId>(() => appIdFromUrl());

  function selectPage(nextPage: SaPage) {
    setPage(nextPage);
    window.history.pushState(
      { page: nextPage },
      "",
      nextPage === "overview" ? "/sa" : `/sa/${nextPage}`
    );
  }

  function openAppOperations(appId: OrchestratedAppId) {
    setSelectedAppId(appId);
    setPage("app-operations");
    window.history.pushState(
      { page: "app-operations", appId },
      "",
      `/sa/app-operations?app=${appId}`
    );
  }

  async function handleLogout() {
    await logout("sa");
    window.location.assign("/sa/login");
  }

  const menuItems: SidemenuItem[] = [
    {
      title: "Overview",
      icon: CircleGaugeIcon,
      isActive: page === "overview",
      onSelect: () => selectPage("overview")
    },
    {
      title: "Task Manager",
      icon: ListChecksIcon,
      isActive: page === "task-manager",
      onSelect: () => selectPage("task-manager")
    },
    {
      title: "Tenant Setup",
      icon: Building2Icon,
      isActive: page === "tenants" || page === "domains" || page === "tenant-access",
      items: [
        { title: "Tenants", isActive: page === "tenants", onSelect: () => selectPage("tenants") },
        { title: "Domains", isActive: page === "domains", onSelect: () => selectPage("domains") },
        {
          title: "Tenant Access",
          isActive: page === "tenant-access",
          onSelect: () => selectPage("tenant-access")
        }
      ]
    },
    {
      title: "Commercial",
      icon: CreditCardIcon,
      isActive: page === "plans" || page === "plan-access" || page === "subscriptions",
      items: [
        { title: "Plans", isActive: page === "plans", onSelect: () => selectPage("plans") },
        {
          title: "Plan Access",
          isActive: page === "plan-access",
          onSelect: () => selectPage("plan-access")
        },
        {
          title: "Subscriptions",
          isActive: page === "subscriptions",
          onSelect: () => selectPage("subscriptions")
        }
      ]
    },
    {
      title: "Catalog",
      icon: AppWindowIcon,
      isActive: page === "apps" || page === "industries",
      items: [
        { title: "Apps", isActive: page === "apps", onSelect: () => selectPage("apps") },
        {
          title: "Industries",
          isActive: page === "industries",
          onSelect: () => selectPage("industries")
        }
      ]
    },
    {
      title: "Governance",
      icon: ShieldCheckIcon,
      isActive: page === "entitlements" || page === "access" || page === "activity",
      items: [
        {
          title: "Entitlements",
          isActive: page === "entitlements",
          onSelect: () => selectPage("entitlements")
        },
        {
          title: "Access Control",
          isActive: page === "access",
          onSelect: () => selectPage("access")
        },
        { title: "Activity", isActive: page === "activity", onSelect: () => selectPage("activity") }
      ]
    },
    {
      title: "Database",
      icon: DatabaseIcon,
      isActive:
        page === "master-database" ||
        page === "tenant-database" ||
        page === "queue-management" ||
        page === "storage-manager",
      items: [
        {
          title: "Master Database",
          isActive: page === "master-database",
          onSelect: () => selectPage("master-database")
        },
        {
          title: "Tenant Databases",
          isActive: page === "tenant-database",
          onSelect: () => selectPage("tenant-database")
        },
        {
          title: "Queue Management",
          isActive: page === "queue-management",
          onSelect: () => selectPage("queue-management")
        },
        {
          title: "Storage Manager",
          isActive: page === "storage-manager",
          onSelect: () => selectPage("storage-manager")
        }
      ]
    },
    {
      title: "Design System",
      icon: PaletteIcon,
      isActive: page === "design-system",
      items: [
        {
          title: "Components",
          isActive: page === "design-system",
          onSelect: () => selectPage("design-system")
        }
      ]
    }
  ];

  return (
    <AuthGate desk="sa">
      <SuperLayout
        homeHref="/"
        menuItems={menuItems}
        onLogout={handleLogout}
        versionLabel={`v ${__APP_VERSION__}`}
        workspace={page === "task-manager" ? "task-manager" : "platform"}
      >
        <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
          {page === "overview" ? <SaOverview onOpenApp={openAppOperations} /> : null}
          {page === "app-operations" ? (
            <AppOrchestrationWorkspace
              appId={selectedAppId}
              onBack={() => selectPage("overview")}
            />
          ) : null}
          {page === "task-manager" ? <TaskManagerWorkspace /> : null}
          {page === "tenants" ? <TenantList onBack={() => selectPage("overview")} /> : null}
          {page === "domains" ? <TenantDomainList /> : null}
          {page === "plans" ? <PlanWorkspace /> : null}
          {page === "plan-access" ? <PlanAccessWorkspace /> : null}
          {page === "subscriptions" ? <SubscriptionWorkspace /> : null}
          {page === "apps" ? <AppRegistryWorkspace /> : null}
          {page === "entitlements" ? <EntitlementWorkspace /> : null}
          {page === "tenant-access" ? <TenantAccessWorkspace /> : null}
          {page === "industries" ? <IndustryWorkspace /> : null}
          {page === "master-database" ? <MasterDatabaseWorkspace /> : null}
          {page === "tenant-database" ? <TenantDatabaseWorkspace /> : null}
          {page === "queue-management" ? <QueueManagementWorkspace /> : null}
          {page === "storage-manager" ? <StorageManagerWorkspace /> : null}
          {page === "access" ? <AccessControlWorkspace /> : null}
          {page === "activity" ? <PlatformActivityWorkspace /> : null}
          {page === "design-system" ? <DesignSystemGallery /> : null}
        </Suspense>
      </SuperLayout>
    </AuthGate>
  );
}

function pageFromUrl(): SaPage {
  const page = window.location.pathname.split("/")[2];
  return page === "app-operations" ||
    page === "task-manager" ||
    page === "tenants" ||
    page === "domains" ||
    page === "plans" ||
    page === "plan-access" ||
    page === "subscriptions" ||
    page === "apps" ||
    page === "entitlements" ||
    page === "tenant-access" ||
    page === "industries" ||
    page === "master-database" ||
    page === "tenant-database" ||
    page === "queue-management" ||
    page === "storage-manager" ||
    page === "access" ||
    page === "activity" ||
    page === "design-system"
    ? page
    : "overview";
}

function appIdFromUrl(): OrchestratedAppId {
  return "platform";
}

function SaOverview({ onOpenApp }: { onOpenApp: (appId: OrchestratedAppId) => void }) {
  const apps = useAppOperationsQuery();
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5 lg:w-[calc(100%-3rem)]">
      <section className="rounded-md border bg-card px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold uppercase text-muted-foreground">
          Repository Operations
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live state for the single Platform runtime and its composed workspace packages.
        </p>
      </section>
      {apps.error ? (
        <section className="rounded-md border border-destructive/40 bg-card p-4 text-sm text-destructive">
          {apps.error.message}
        </section>
      ) : null}
      <AppOperationsStrip apps={apps.data ?? []} onSelect={onOpenApp} />
    </main>
  );
}
