import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspaceFormField } from "@cxapp/ui/workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cxapp/ui/components/tabs";
import { WorkspaceDatePicker } from "@cxapp/ui/workspace/date-picker";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { GstStatementForm } from "./gst-statement.form";
import { useGstStatement } from "./gst-statement.hooks";
import { GstStatementList } from "./gst-statement.list";
import { GstStatementPrint, type GstStatementPrintScope } from "./gst-statement.print";
import { gstStatementFilingSchema } from "./gst-statement.schema";
import { formatGstStatementMoney, saveGstStatementFiling } from "./gst-statement.services";
import type { GstStatement, GstStatementFilingPayload } from "./gst-statement.types";

const blankFiling: GstStatementFilingPayload = {
  gstr1Arn: "",
  gstr1FiledOn: null,
  gstr3bArn: "",
  gstr3bFiledOn: null,
  month: 1,
  openingBalance: 0,
  year: new Date().getFullYear()
};

export function GstStatementWorkspace() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<number>();
  const [year, setYear] = useState<number>();
  const [filing, setFiling] = useState<GstStatementFilingPayload>(blankFiling);
  const [filingError, setFilingError] = useState("");
  const [activeTab, setActiveTab] = useState("statement");
  const [printStatement, setPrintStatement] = useState<GstStatement>();
  const [printScope, setPrintScope] = useState<GstStatementPrintScope>("all");
  const query = useGstStatement({ month, year });
  const statement = query.data;

  useEffect(() => {
    if (!statement) return;
    setMonth(statement.month);
    setYear(statement.year);
    setFiling({
      gstr1Arn: statement.filing.gstr1Arn,
      gstr1FiledOn: statement.filing.gstr1FiledOn,
      gstr3bArn: statement.filing.gstr3bArn,
      gstr3bFiledOn: statement.filing.gstr3bFiledOn,
      month: statement.month,
      openingBalance: statement.filing.openingBalance,
      year: statement.year
    });
    setFilingError("");
  }, [statement]);

  const saveMutation = useMutation({
    mutationFn: saveGstStatementFiling,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "reports", "gst-statement"] });
      toast.success("GST filing details saved");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "GST filing details could not be saved.";
      setFilingError(message);
      toast.error(message);
    }
  });

  function saveFiling() {
    const parsed = gstStatementFilingSchema.safeParse(filing);
    if (!parsed.success) {
      setFilingError(parsed.error.issues[0]?.message ?? "Check GST filing details.");
      return;
    }
    setFilingError("");
    saveMutation.mutate(parsed.data);
  }

  function handlePrint(scope: GstStatementPrintScope = "all") {
    if (!statement) return;
    setPrintScope(scope);
    setPrintStatement(statement);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  const balance =
    filing.openingBalance +
    (statement?.sales.taxAmount ?? 0) -
    (statement?.purchases.taxAmount ?? 0);

  return (
    <WorkspacePage
      className="billing-document-print-page"
      actions={
        <div className="flex gap-2 print:hidden">
          <Button disabled={!statement} onClick={() => handlePrint("all")} type="button">
            <Printer className="size-4" />
            Print
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
      description="Monthly GST sales, purchase, HSN, reconciliation, and filing details."
      technicalName="page.billing.reports.gst-statement"
      title="GST Statement"
    >
      <main className="space-y-4">
        <GstStatementForm
          availableYears={statement?.availableYears ?? []}
          month={month ?? statement?.month}
          onMonthChange={setMonth}
          onYearChange={setYear}
          year={year ?? statement?.year}
        />

        {query.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "GST Statement could not be loaded."}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-card px-4 py-3">
          <div>
            <div className="font-semibold">{statement?.monthLabel ?? "Monthly GST return"}</div>
            <div className="text-sm text-muted-foreground">
              {statement?.companyName ?? "Selected company"}
              {statement?.companyGstin ? ` · GSTIN ${statement.companyGstin}` : ""}
              {statement ? ` · ${statement.financialYearName}` : ""}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {statement ? `${formatDate(statement.from)} to ${formatDate(statement.to)}` : ""}
          </div>
        </div>

        <Tabs className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border/90 bg-transparent p-0">
            <TabsTrigger
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              value="statement"
            >
              GST statement
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              value="filing"
            >
              Filed details
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4 space-y-4" value="statement">
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <GstStatementList
                loading={query.isLoading}
                onPrint={() => handlePrint("sales")}
                panel={statement?.sales}
                side="sales"
              />
              <GstStatementList
                loading={query.isLoading}
                onPrint={() => handlePrint("purchase")}
                panel={statement?.purchases}
                side="purchase"
              />
            </div>

            <section className="rounded-md border border-border/80 bg-card p-4 shadow-sm">
              <header className="border-b border-border/70 pb-3">
                <h2 className="font-semibold">GST reconciliation summary</h2>
                <p className="text-sm text-muted-foreground">
                  Opening balance + Sales GST − Purchase GST = Closing balance
                </p>
              </header>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTotal label="Opening balance" prefix="" value={filing.openingBalance} />
                <SummaryTotal
                  label="Sales GST"
                  prefix="+"
                  value={statement?.sales.taxAmount ?? 0}
                />
                <SummaryTotal
                  label="Purchase GST"
                  prefix="−"
                  value={statement?.purchases.taxAmount ?? 0}
                />
                <SummaryTotal label="Balance" prefix="=" strong value={balance} />
              </div>
            </section>
          </TabsContent>

          <TabsContent className="mt-4" value="filing">
            <section className="rounded-md border border-border/80 bg-card p-4 shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <h2 className="font-semibold">GST filed details</h2>
                  <p className="text-sm text-muted-foreground">
                    Save the opening balance, ARN number, and filed date for this return period.
                  </p>
                </div>
                {statement?.filing.updatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Last saved {new Date(statement.filing.updatedAt).toLocaleString("en-IN")}
                  </span>
                ) : null}
              </header>
              {filingError ? (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {filingError}
                </div>
              ) : null}
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <WorkspaceFormField label="Opening GST balance">
                  <Input
                    className="h-11"
                    inputMode="decimal"
                    onChange={(event) =>
                      setFiling((current) => ({
                        ...current,
                        openingBalance: Number(event.target.value || 0)
                      }))
                    }
                    type="number"
                    value={filing.openingBalance}
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="GSTR-1 ARN No">
                  <Input
                    className="h-11 uppercase"
                    maxLength={80}
                    onChange={(event) =>
                      setFiling((current) => ({ ...current, gstr1Arn: event.target.value }))
                    }
                    placeholder="Enter GSTR-1 ARN"
                    value={filing.gstr1Arn}
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="GSTR-1 filed date">
                  <WorkspaceDatePicker
                    onValueChange={(value) =>
                      setFiling((current) => ({ ...current, gstr1FiledOn: value || null }))
                    }
                    value={filing.gstr1FiledOn ?? ""}
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="GSTR-3B ARN No">
                  <Input
                    className="h-11 uppercase"
                    maxLength={80}
                    onChange={(event) =>
                      setFiling((current) => ({ ...current, gstr3bArn: event.target.value }))
                    }
                    placeholder="Enter GSTR-3B ARN"
                    value={filing.gstr3bArn}
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="GSTR-3B filed date">
                  <WorkspaceDatePicker
                    onValueChange={(value) =>
                      setFiling((current) => ({ ...current, gstr3bFiledOn: value || null }))
                    }
                    value={filing.gstr3bFiledOn ?? ""}
                  />
                </WorkspaceFormField>
              </div>
              <div className="mt-4 flex justify-end border-t border-border/70 pt-4">
                <Button
                  disabled={!statement || saveMutation.isPending}
                  onClick={saveFiling}
                  type="button"
                >
                  <Save className="size-4" />
                  {saveMutation.isPending ? "Saving..." : "Save filed details"}
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="billing-print-area hidden print:block">
          {printStatement ? (
            <GstStatementPrint scope={printScope} statement={printStatement} />
          ) : null}
        </section>
      </main>
    </WorkspacePage>
  );
}

function SummaryTotal({
  label,
  prefix,
  strong,
  value
}: {
  label: string;
  prefix: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        strong ? "border-primary/40 bg-primary/5" : "border-border/70 bg-muted/20"
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-lg", strong ? "font-bold text-primary" : "font-semibold")}>
        {prefix ? `${prefix} ` : ""}
        {formatGstStatementMoney(value)}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
