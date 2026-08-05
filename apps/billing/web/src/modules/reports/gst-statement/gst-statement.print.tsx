import { WorkspacePrintSheet } from "@cxapp/ui/workspace/print";
import { BillingDocumentHeader } from "../../settings";
import { formatGstQuantity, formatGstStatementMoney } from "./gst-statement.services";
import type { GstStatement, GstStatementPanel } from "./gst-statement.types";

export type GstStatementPrintScope = "all" | "purchase" | "sales";

export function GstStatementPrint({
  scope = "all",
  statement
}: {
  scope?: GstStatementPrintScope;
  statement: GstStatement;
}) {
  const salesOnly = scope === "sales";
  const purchaseOnly = scope === "purchase";
  const documentTitle = salesOnly
    ? "GST Sales Statement"
    : purchaseOnly
      ? "GST Purchase Statement"
      : "GST Statement";

  return (
    <WorkspacePrintSheet className="billing-print-document billing-statement-print-document">
      <style>{printStyles}</style>
      <article className="bg-white px-3 py-3 text-[9px] text-black">
        <BillingDocumentHeader
          className="border border-slate-500"
          documentMeta={
            <>
              {statement.monthLabel} • {statement.financialYearName}
              {statement.companyGstin ? ` • GSTIN ${statement.companyGstin}` : ""}
            </>
          }
          documentTitle={documentTitle}
        />

        {scope !== "purchase" ? (
          <PrintPanel panel={statement.sales} title="Sales / Outward" />
        ) : null}
        {scope !== "sales" ? (
          <PrintPanel panel={statement.purchases} title="Purchase / Inward" />
        ) : null}

        {scope === "all" ? (
          <section className="mt-3 border border-slate-500">
            <h2 className="border-b border-slate-500 bg-slate-100 px-2 py-1.5 text-[10px] font-bold">
              GST reconciliation summary
            </h2>
            <div className="grid grid-cols-4">
              <PrintTotal label="Opening balance" value={statement.summary.openingBalance} />
              <PrintTotal label="+ Sales GST" value={statement.summary.salesTax} />
              <PrintTotal label="− Purchase GST" value={statement.summary.purchaseTax} />
              <PrintTotal label="= Balance" strong value={statement.summary.balance} />
            </div>
          </section>
        ) : null}

        {scope === "all" ? (
          <section className="mt-3 border border-slate-500">
            <h2 className="border-b border-slate-500 bg-slate-100 px-2 py-1.5 text-[10px] font-bold">
              GST filed details
            </h2>
            <div className="grid grid-cols-2">
              <FiledDetail
                arn={statement.filing.gstr1Arn}
                filedOn={statement.filing.gstr1FiledOn}
                label="GSTR-1"
              />
              <FiledDetail
                arn={statement.filing.gstr3bArn}
                filedOn={statement.filing.gstr3bFiledOn}
                label="GSTR-3B"
              />
            </div>
          </section>
        ) : null}

        <footer className="flex justify-between border-x border-b border-slate-500 px-3 py-2">
          <span>Generated {new Date().toLocaleString("en-IN")}</span>
          <span className="font-semibold">For {statement.companyName}</span>
        </footer>
      </article>
    </WorkspacePrintSheet>
  );
}

function PrintPanel({ panel, title }: { panel: GstStatementPanel; title: string }) {
  return (
    <section className="mt-3 break-inside-auto border border-slate-500">
      <div className="flex items-center justify-between border-b border-slate-500 bg-slate-100 px-2 py-1.5">
        <h2 className="text-[10px] font-bold">{title}</h2>
        <span>{panel.documentCount} documents</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {[
              "#",
              "GST No",
              "Contact name",
              "Taxable",
              "Tax %",
              "IGST",
              "CGST",
              "SGST",
              "Invoice total"
            ].map((heading) => (
              <th
                className="border-b border-r border-slate-500 px-1.5 py-1 text-left last:border-r-0"
                key={heading}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {panel.documents.length ? (
            panel.documents.map((entry) => (
              <tr key={`${entry.documentType}-${entry.documentNumber}`}>
                <td className="border-b border-r border-slate-300 px-1.5 py-1">{entry.serial}</td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1">
                  {entry.gstin || "Unregistered"}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1">
                  <div>{entry.contactName}</div>
                  <div className="text-[8px] text-slate-600">
                    {entry.documentNumber} • {formatDate(entry.documentDate)}
                  </div>
                </td>
                <PrintMoney value={entry.taxableAmount} />
                <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right">
                  {entry.taxRates.length
                    ? entry.taxRates.map((rate) => `${rate}%`).join(", ")
                    : "0%"}
                </td>
                <PrintMoney value={entry.igstAmount} />
                <PrintMoney value={entry.cgstAmount} />
                <PrintMoney value={entry.sgstAmount} />
                <PrintMoney last strong value={entry.invoiceTotal} />
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-2 py-3 text-center" colSpan={9}>
                No confirmed documents.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 className="border-y border-slate-500 bg-slate-100 px-2 py-1.5 font-bold">
        HSN-wise report
      </h3>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["HSN code", "Product name", "Total qty", "Taxable", "IGST", "CGST", "SGST"].map(
              (heading) => (
                <th
                  className="border-b border-r border-slate-500 px-1.5 py-1 text-left last:border-r-0"
                  key={heading}
                >
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {panel.hsn.length ? (
            panel.hsn.map((entry) => (
              <tr key={`${entry.hsnCode}-${entry.productName}`}>
                <td className="border-b border-r border-slate-300 px-1.5 py-1">{entry.hsnCode}</td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1">
                  {entry.productName}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right">
                  {formatGstQuantity(entry.totalQuantity)}
                </td>
                <PrintMoney value={entry.taxableAmount} />
                <PrintMoney value={entry.igstAmount} />
                <PrintMoney value={entry.cgstAmount} />
                <PrintMoney last value={entry.sgstAmount} />
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-2 py-3 text-center" colSpan={7}>
                No HSN movement.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function PrintMoney({ last, strong, value }: { last?: boolean; strong?: boolean; value: number }) {
  return (
    <td
      className={`border-b border-slate-300 px-1.5 py-1 text-right ${last ? "" : "border-r"} ${strong ? "font-bold" : ""}`}
    >
      {formatGstStatementMoney(value)}
    </td>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="border-r border-slate-500 px-2 py-2 last:border-r-0">
      <div className="text-[8px] uppercase">{label}</div>
      <div className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>
        {formatGstStatementMoney(value)}
      </div>
    </div>
  );
}

function FiledDetail({
  arn,
  filedOn,
  label
}: {
  arn: string;
  filedOn: string | null;
  label: string;
}) {
  return (
    <div className="border-r border-slate-500 px-2 py-2 last:border-r-0">
      <div className="font-bold">{label}</div>
      <div className="mt-1">ARN No: {arn || "Not filed"}</div>
      <div>Filed date: {filedOn ? formatDate(filedOn) : "Not filed"}</div>
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

const printStyles = `@media print { .billing-statement-print-document { break-inside: auto !important; } .billing-statement-print-document thead { display: table-header-group; } .billing-statement-print-document tr { break-inside: avoid; } }`;
