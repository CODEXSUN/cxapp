import { lazy, useState, type ComponentType } from "react";
import { enabledAppIds } from "../../app/app-registry";
import { getSessionContext } from "../../shared/api/platform-api";
import { AuthGate } from "../../shared/auth/AuthGate";
import { publishAccountingYear, publishCompanyContext } from "../../shared/tenant/runtime-context";

const AppDesk = lazy(() => import("./AppDesk").then((module) => ({ default: module.AppDesk })));

const printPages = {
  "export-sales": lazyPrintPage(() =>
    import("@cxapp/billing-web/modules/export-sales").then(
      (module) => module.ExportSalesPrintRoutePage
    )
  ),
  purchase: lazyPrintPage(() =>
    import("@cxapp/billing-web/modules/purchase").then((module) => module.PurchasePrintRoutePage)
  ),
  quotation: lazyPrintPage(() =>
    import("@cxapp/billing-web/modules/quotation").then((module) => module.QuotationPrintRoutePage)
  ),
  sales: lazyPrintPage(() =>
    import("@cxapp/billing-web/modules/sales").then((module) => module.SalesPrintRoutePage)
  )
} as const;

type BillingPrintDocument = keyof typeof printPages;

export function BillingPrintRoute({ document }: { document: BillingPrintDocument }) {
  const autoPrint = new URLSearchParams(window.location.search).get("autoprint") === "1";

  if (!autoPrint) return <AppDesk />;

  return (
    <AuthGate desk="tenant">
      <BillingPrintBootstrap document={document} />
    </AuthGate>
  );
}

function BillingPrintBootstrap({ document }: { document: BillingPrintDocument }) {
  const [preparation] = useState(prepareBillingPrintContext);

  if (!preparation.ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-sm">
          <div className="text-base font-semibold">Print setup could not be loaded</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{preparation.message}</p>
        </div>
      </main>
    );
  }

  const PrintPage = printPages[document];
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
      <PrintPage />
    </main>
  );
}

function prepareBillingPrintContext(): { message: string; ready: false } | { ready: true } {
  const context = getSessionContext();
  if (!context) {
    return { message: "The authenticated tenant context is unavailable.", ready: false };
  }
  if (!enabledAppIds(context.enabledModuleKeys).includes("billing")) {
    return { message: "Billing is not enabled for this tenant.", ready: false };
  }

  const companyId = context.defaultCompany?.companyId ?? context.company?.id;
  const financialYearId = context.defaultCompany?.financialYearId;
  if (!companyId || !financialYearId) {
    return {
      message: "Select a default company and financial year before printing.",
      ready: false
    };
  }

  publishCompanyContext(companyId);
  publishAccountingYear(financialYearId);
  return { ready: true };
}

function lazyPrintPage(loader: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await loader() }));
}
