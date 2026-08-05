import { ArrowDownLeft, ArrowUpRight, Printer } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { formatGstQuantity, formatGstStatementMoney } from "./gst-statement.services";
import type { GstStatementPanel } from "./gst-statement.types";

export function GstStatementList({
  loading,
  onPrint,
  panel,
  side
}: {
  loading: boolean;
  onPrint?: () => void;
  panel: GstStatementPanel | undefined;
  side: "purchase" | "sales";
}) {
  const sales = side === "sales";
  const documents = panel?.documents ?? [];
  const hsn = panel?.hsn ?? [];
  return (
    <section className="min-w-0 space-y-4 rounded-md border border-border/80 bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border/70 bg-muted/40 p-2">
            {sales ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
          </div>
          <div>
            <h2 className="font-semibold">{sales ? "Sales / Outward" : "Purchase / Inward"}</h2>
            <p className="text-sm text-muted-foreground">
              {sales
                ? "Confirmed sales and export sales for this return period."
                : "Confirmed purchase records eligible for the selected period."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <WorkspaceStatusBadge
            label={`${panel?.documentCount ?? 0} documents`}
            tone={sales ? "info" : "success"}
          />
          <Button disabled={!panel} onClick={onPrint} size="sm" type="button" variant="outline">
            <Printer className="size-4" />
            Print {sales ? "sales" : "purchase"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PanelTotal label="Taxable" value={panel?.taxableAmount ?? 0} />
        <PanelTotal label="GST" value={panel?.taxAmount ?? 0} />
        <PanelTotal label="IGST" value={panel?.igstAmount ?? 0} />
        <PanelTotal label="Invoice total" value={panel?.invoiceTotal ?? 0} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Document report</h3>
        <WorkspaceTablePanel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "#",
                    "GST No",
                    "Contact name",
                    "Taxable amount",
                    "Tax %",
                    "IGST",
                    "CGST",
                    "SGST",
                    "Invoice total"
                  ].map((heading) => (
                    <th
                      className={`border-b border-border/70 px-3 py-2.5 font-semibold uppercase tracking-wide text-muted-foreground ${["Taxable amount", "Tax %", "IGST", "CGST", "SGST", "Invoice total"].includes(heading) ? "text-right" : "text-left"}`}
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((entry) => (
                  <tr
                    className="border-b border-border/70 last:border-b-0"
                    key={`${entry.documentType}-${entry.documentNumber}`}
                  >
                    <td className="px-3 py-2.5">{entry.serial}</td>
                    <td className="px-3 py-2.5 font-medium">{entry.gstin || "Unregistered"}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{entry.contactName}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {entry.documentNumber} · {formatDate(entry.documentDate)}
                        {entry.documentType === "export-sale" ? " · Export" : ""}
                      </div>
                    </td>
                    <MoneyCell value={entry.taxableAmount} />
                    <td className="px-3 py-2.5 text-right font-medium">
                      {entry.taxRates.length
                        ? entry.taxRates.map((rate) => `${rate}%`).join(", ")
                        : "0%"}
                    </td>
                    <MoneyCell value={entry.igstAmount} />
                    <MoneyCell value={entry.cgstAmount} />
                    <MoneyCell value={entry.sgstAmount} />
                    <MoneyCell strong value={entry.invoiceTotal} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!documents.length && loading ? <WorkspaceTableLoadingState /> : null}
          {!documents.length && !loading ? (
            <WorkspaceTableEmptyState>
              No confirmed {sales ? "sales" : "purchase"} documents found for this month.
            </WorkspaceTableEmptyState>
          ) : null}
        </WorkspaceTablePanel>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">HSN-wise report</h3>
        <WorkspaceTablePanel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "HSN code",
                    "Product name",
                    "Total qty",
                    "Taxable amount",
                    "IGST",
                    "CGST",
                    "SGST"
                  ].map((heading) => (
                    <th
                      className={`border-b border-border/70 px-3 py-2.5 font-semibold uppercase tracking-wide text-muted-foreground ${["Total qty", "Taxable amount", "IGST", "CGST", "SGST"].includes(heading) ? "text-right" : "text-left"}`}
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hsn.map((entry) => (
                  <tr
                    className="border-b border-border/70 last:border-b-0"
                    key={`${entry.hsnCode}-${entry.productName}`}
                  >
                    <td className="px-3 py-2.5 font-medium">{entry.hsnCode}</td>
                    <td className="px-3 py-2.5">{entry.productName}</td>
                    <td className="px-3 py-2.5 text-right">
                      {formatGstQuantity(entry.totalQuantity)}
                    </td>
                    <MoneyCell value={entry.taxableAmount} />
                    <MoneyCell value={entry.igstAmount} />
                    <MoneyCell value={entry.cgstAmount} />
                    <MoneyCell value={entry.sgstAmount} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hsn.length && loading ? <WorkspaceTableLoadingState /> : null}
          {!hsn.length && !loading ? (
            <WorkspaceTableEmptyState>
              No HSN movement found for this month.
            </WorkspaceTableEmptyState>
          ) : null}
        </WorkspaceTablePanel>
      </div>
    </section>
  );
}

function PanelTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{formatGstStatementMoney(value)}</div>
    </div>
  );
}

function MoneyCell({ strong, value }: { strong?: boolean; value: number }) {
  return (
    <td className={`px-3 py-2.5 text-right ${strong ? "font-semibold" : ""}`}>
      {formatGstStatementMoney(value)}
    </td>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
