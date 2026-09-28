import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { useSupplierSummary } from "./supplier-summary.hooks";
import { SupplierSummaryForm } from "./supplier-summary.form";
import { SupplierSummaryList } from "./supplier-summary.list";
import { supplierSummaryFiltersSchema } from "./supplier-summary.schema";
import { formatSupplierSummaryMoney } from "./supplier-summary.services";

export function SupplierSummaryWorkspace() {
  const [search, setSearch] = useState("");
  const query = useSupplierSummary();
  const summary = query.data;
  const filters = supplierSummaryFiltersSchema.parse({ search });
  const entries = useMemo(
    () => filterSupplierSummary(summary?.items ?? [], filters.search),
    [filters.search, summary?.items]
  );
  return (
    <WorkspacePage
      actions={
        <Button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
      description="One payable outstanding balance per supplier for the active financial year. Credit includes opening balance."
      technicalName="page.billing.reports.supplier-summary"
      title="Supplier Summary"
    >
      <main className="space-y-4">
        {query.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Supplier Summary could not be loaded."}
          </div>
        ) : null}
        <SupplierSummaryForm onSearchChange={setSearch} search={search} />
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTotal label="Debit" value={summary?.totalDebit ?? 0} />
          <SummaryTotal label="Credit" value={summary?.totalCredit ?? 0} />
          <SummaryTotal label="Outstanding balance" strong value={summary?.totalBalance ?? 0} />
        </div>
        <SupplierSummaryList entries={entries} loading={query.isLoading} />
      </main>
    </WorkspacePage>
  );
}

function filterSupplierSummary<T extends { code: string; name: string }>(
  entries: T[],
  search: string
) {
  const normalizedSearch = search.toLocaleLowerCase();
  if (!normalizedSearch) return entries;
  return entries.filter((entry) =>
    `${entry.name} ${entry.code}`.toLocaleLowerCase().includes(normalizedSearch)
  );
}

function SummaryTotal({
  label,
  strong,
  value
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-semibold", strong && "font-bold text-primary")}>
        {formatSupplierSummaryMoney(value)}
      </div>
    </div>
  );
}
