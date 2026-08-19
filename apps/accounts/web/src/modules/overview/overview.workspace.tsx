import { Layers, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { getTenantUserIdentity } from "../../shared/api/tenant-context";
import { useAccountsOverview } from "./overview.hooks";
import { OverviewKpiCard, OverviewModulesWidget, OverviewWidget } from "./overview.widgets";

export function AccountsOverviewWorkspace() {
  const query = useAccountsOverview();
  const overview = query.data;
  const signedInUser = getTenantUserIdentity();

  if (query.isLoading) {
    return <GlobalLoader className="min-h-[32rem]" fullScreen={false} />;
  }

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="relative min-h-36 p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-sky-100 via-blue-50 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 place-items-center rounded-md bg-sky-600 text-white">
                <Layers className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Accounts</p>
                <h1 className="mt-1 text-3xl font-semibold">Accounts Desk</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fast company and financial-year overview for accounting operations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium">
                <UserRound className="size-4" />
                Signed in as {signedInUser.name}
              </span>
              <Button
                aria-label="Refresh overview"
                onClick={() => void query.refetch()}
                size="icon"
                type="button"
                variant="outline"
              >
                <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {query.isError ? (
        <OverviewWidget title="Overview unavailable">
          <div className="py-8 text-sm text-rose-600">
            {query.error instanceof Error
              ? query.error.message
              : "Accounts overview could not be loaded."}
          </div>
        </OverviewWidget>
      ) : null}
      {overview ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <OverviewKpiCard
              caption={overview.kpis[0]?.caption ?? "Ledger groups configured"}
              icon={<Layers className="size-5" />}
              title={overview.kpis[0]?.title ?? "Ledger Groups"}
              value={overview.kpis[0]?.value ?? "0"}
            />
            <OverviewKpiCard
              caption={overview.kpis[1]?.caption ?? "Ledger accounts created"}
              icon={<Layers className="size-5" />}
              title={overview.kpis[1]?.title ?? "Ledgers"}
              value={overview.kpis[1]?.value ?? "0"}
            />
            <OverviewKpiCard
              caption={overview.kpis[2]?.caption ?? "Current financial year"}
              icon={<Layers className="size-5" />}
              title={overview.kpis[2]?.title ?? "Accounting Year"}
              value={overview.kpis[2]?.value ?? "Active"}
            />
          </div>
          <OverviewModulesWidget />
        </>
      ) : null}
    </section>
  );
}