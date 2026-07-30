import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { BillingDocumentHeader } from "../../settings";
import { formatGstStatementMoney } from "./gst-statement.services";
import type { GstStatement } from "./gst-statement.types";

export function GstStatementPrint({ statement }: { statement: GstStatement }) {
  return (
    <WorkspacePrintSheet className="billing-print-document billing-statement-print-document">
      <style>{printStyles}</style>
      <article className="bg-white px-3 py-3 text-[10px] text-black">
        <BillingDocumentHeader
          className="border border-slate-500"
          documentMeta={
            <>
              {statement.financialYearName} · {formatDate(statement.from)} to{" "}
              {formatDate(statement.to)}
            </>
          }
          documentTitle="GST Statement"
        />
        <section className="grid grid-cols-6 border-x border-b border-slate-500">
          <PrintTotal label="Outward Taxable" value={statement.outwardTaxableAmount} />
          <PrintTotal label="Inward Taxable" value={statement.inwardTaxableAmount} />
          <PrintTotal label="Outward GST" value={statement.outwardTaxAmount} />
          <PrintTotal label="Input GST" value={statement.inwardTaxAmount} />
          <PrintTotal label="Net GST Payable" strong value={statement.netTaxPayable} />
          <PrintTotal label="IGST" value={statement.igstAmount} />
        </section>
        <table className="w-full border-collapse border-x border-b border-slate-500">
          <thead>
            <tr>
              {[
                "Direction",
                "GST Rate",
                "Documents",
                "Taxable",
                "CGST",
                "SGST",
                "IGST",
                "Tax Total"
              ].map((heading) => (
                <th
                  className="border-b border-r border-slate-500 px-2 py-2 text-left last:border-r-0"
                  key={heading}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statement.items.map((entry) => (
              <tr key={`${entry.direction}-${entry.taxRate}`}>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 capitalize">
                  {entry.direction}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right font-semibold">
                  {entry.taxRate}%
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {entry.documentCount}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {formatGstStatementMoney(entry.taxableAmount)}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {formatGstStatementMoney(entry.cgstAmount)}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {formatGstStatementMoney(entry.sgstAmount)}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {formatGstStatementMoney(entry.igstAmount)}
                </td>
                <td className="border-b border-slate-300 px-2 py-1.5 text-right font-semibold">
                  {formatGstStatementMoney(entry.taxAmount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border-r border-slate-500 px-2 py-2" colSpan={3}>
                Total
              </td>
              <td className="border-r border-slate-500 px-2 py-2 text-right">
                {formatGstStatementMoney(
                  statement.outwardTaxableAmount + statement.inwardTaxableAmount
                )}
              </td>
              <td className="border-r border-slate-500 px-2 py-2 text-right">
                {formatGstStatementMoney(statement.cgstAmount)}
              </td>
              <td className="border-r border-slate-500 px-2 py-2 text-right">
                {formatGstStatementMoney(statement.sgstAmount)}
              </td>
              <td className="border-r border-slate-500 px-2 py-2 text-right">
                {formatGstStatementMoney(statement.igstAmount)}
              </td>
              <td className="px-2 py-2 text-right">
                {formatGstStatementMoney(statement.taxAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
        <footer className="flex justify-between border-x border-b border-slate-500 px-3 py-3">
          <span>
            Tax rows: {statement.total} · Generated {new Date().toLocaleString("en-IN")}
          </span>
          <span className="font-semibold">For {statement.companyName}</span>
        </footer>
      </article>
    </WorkspacePrintSheet>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="border-r border-slate-500 px-1.5 py-2 last:border-r-0">
      <div className="text-[8px] uppercase">{label}</div>
      <div className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>
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

const printStyles = `@media print { .billing-statement-print-document { break-inside: auto !important; } .billing-statement-print-document thead { display: table-header-group; } .billing-statement-print-document tr { break-inside: avoid; } }`;
