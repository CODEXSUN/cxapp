import { useEffect, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { GstStatementForm } from "./gst-statement.form";
import { useGstStatement } from "./gst-statement.hooks";
import { GstStatementList } from "./gst-statement.list";
import { GstStatementPrint } from "./gst-statement.print";
import { formatGstStatementMoney, getGstStatementForPrint } from "./gst-statement.services";
import type { GstStatement } from "./gst-statement.types";

export function GstStatementWorkspace() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [printStatement, setPrintStatement] = useState<GstStatement>();
  const [printing, setPrinting] = useState(false);
  const query = useGstStatement({ from, page, pageSize, to });
  const statement = query.data;

  useEffect(() => {
    if (!statement) return;
    if (!from) setFrom(statement.from);
    if (!to) setTo(statement.to);
  }, [from, statement, to]);

  const totalPages = Math.max(1, Math.ceil((statement?.total ?? 0) / pageSize));

  async function handlePrint() {
    setPrinting(true);
    try {
      const complete = await getGstStatementForPrint({
        from: from || statement?.from || "",
        to: to || statement?.to || ""
      });
      setPrintStatement(complete);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GST Statement could not be printed.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <WorkspacePage
      className="billing-document-print-page"
      actions={
        <div className="flex gap-2 print:hidden">
          <Button
            disabled={!statement || printing}
            onClick={() => void handlePrint()}
            type="button"
          >
            <Printer className="size-4" />
            {printing ? "Preparing..." : "Print"}
          </Button>
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
      description="GST inward and outward taxable values grouped by transaction direction and tax rate."
      technicalName="page.billing.reports.gst-statement"
      title="GST Statement"
    >
      <main className="space-y-4">
        <GstStatementForm
          from={from || statement?.from || ""}
          onFromChange={(value) => {
            setFrom(value);
            setPage(1);
          }}
          onToChange={(value) => {
            setTo(value);
            setPage(1);
          }}
          to={to || statement?.to || ""}
        />
        {query.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "GST Statement could not be loaded."}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <GstStatementTotal label="Outward taxable" value={statement?.outwardTaxableAmount ?? 0} />
          <GstStatementTotal label="Inward taxable" value={statement?.inwardTaxableAmount ?? 0} />
          <GstStatementTotal label="Outward GST" value={statement?.outwardTaxAmount ?? 0} />
          <GstStatementTotal label="Input GST" value={statement?.inwardTaxAmount ?? 0} />
          <GstStatementTotal label="Net GST payable" strong value={statement?.netTaxPayable ?? 0} />
          <GstStatementTotal label="IGST" value={statement?.igstAmount ?? 0} />
        </div>
        <GstStatementList entries={statement?.items ?? []} loading={query.isLoading} />
        <WorkspacePagination
          onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
          onPageChange={setPage}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          onRowsPerPageChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50, 100, 200]}
          showingLabel={`${statement?.items.length ?? 0} tax rows on this page`}
          singularLabel="tax rows"
          totalCount={statement?.total ?? 0}
          totalPages={totalPages}
        />
        <section className="billing-print-area hidden print:block">
          <div>{printStatement ? <GstStatementPrint statement={printStatement} /> : null}</div>
        </section>
      </main>
    </WorkspacePage>
  );
}

function GstStatementTotal({
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
      <div className={cn("mt-1 text-lg", strong ? "font-bold text-primary" : "font-semibold")}>
        {formatGstStatementMoney(value)}
      </div>
    </div>
  );
}
