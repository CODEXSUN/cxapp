import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { useCustomerSummary } from "./customer-summary.hooks";
import { CustomerSummaryForm } from "./customer-summary.form";
import { CustomerSummaryList } from "./customer-summary.list";
import { customerSummaryFiltersSchema } from "./customer-summary.schema";
import { formatCustomerSummaryMoney } from "./customer-summary.services";

export function CustomerSummaryWorkspace() {
  const [search, setSearch] = useState("");
  const query = useCustomerSummary();
  const summary = query.data;
  const filters = customerSummaryFiltersSchema.parse({ search });
  const entries = useMemo(
    () => filterCustomerSummary(summary?.items ?? [], filters.search),
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
      description="One receivable outstanding balance per customer for the active financial year. Debit includes opening balance."
      technicalName="page.billing.reports.customer-summary"
      title="Customer Summary"
    >
      <main className="space-y-4">
        {query.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Customer Summary could not be loaded."}
          </div>
        ) : null}
        <CustomerSummaryForm onSearchChange={setSearch} search={search} />
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTotal label="Debit" value={summary?.totalDebit ?? 0} />
          <SummaryTotal label="Credit" value={summary?.totalCredit ?? 0} />
          <SummaryTotal label="Outstanding balance" strong value={summary?.totalBalance ?? 0} />
        </div>
        <CustomerSummaryList entries={entries} loading={query.isLoading} />
      </main>
    </WorkspacePage>
  );
}

function filterCustomerSummary<T extends { code: string; name: string }>(
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
        {formatCustomerSummaryMoney(value)}
      </div>
    </div>
  );
}
