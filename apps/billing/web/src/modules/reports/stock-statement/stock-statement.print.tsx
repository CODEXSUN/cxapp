import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { BillingDocumentHeader } from "../../settings";
import { formatStockQuantity, formatStockStatementMoney } from "./stock-statement.services";
import type { StockStatement } from "./stock-statement.types";

export function StockStatementPrint({ statement }: { statement: StockStatement }) {
  return (
    <WorkspacePrintSheet className="billing-print-document billing-statement-print-document">
      <style>{printStyles}</style>
      <article className="bg-white px-3 py-3 text-[9px] text-black">
        <BillingDocumentHeader
          className="border border-slate-500"
          documentMeta={
            <>
              {statement.financialYearName} · {formatDate(statement.from)} to{" "}
              {formatDate(statement.to)}
              {statement.search ? ` · Product filter: ${statement.search}` : ""}
            </>
          }
          documentTitle="Stock Statement"
        />
        <section className="grid grid-cols-6 border-x border-b border-slate-500">
          <PrintTotal label="Opening Qty" value={formatStockQuantity(statement.openingQuantity)} />
          <PrintTotal label="Inward Qty" value={formatStockQuantity(statement.inwardQuantity)} />
          <PrintTotal label="Outward Qty" value={formatStockQuantity(statement.outwardQuantity)} />
          <PrintTotal
            label="Closing Qty"
            strong
            value={formatStockQuantity(statement.closingQuantity)}
          />
          <PrintTotal
            label="Purchase Value"
            value={formatStockStatementMoney(statement.purchaseValue)}
          />
          <PrintTotal label="Sales Value" value={formatStockStatementMoney(statement.salesValue)} />
        </section>
        <table className="w-full border-collapse border-x border-b border-slate-500">
          <thead>
            <tr>
              {[
                "Product",
                "HSN",
                "Unit",
                "Opening",
                "Inward",
                "Outward",
                "Closing",
                "Purchase Value",
                "Sales Value"
              ].map((heading) => (
                <th
                  className="border-b border-r border-slate-500 px-1.5 py-2 text-left last:border-r-0"
                  key={heading}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statement.items.map((entry) => (
              <tr key={entry.productId}>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 font-semibold">
                  {entry.productName}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5">
                  {entry.hsnCode || "-"}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5">
                  {entry.unitName || "-"}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 text-right">
                  {formatStockQuantity(entry.openingQuantity)}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 text-right">
                  {formatStockQuantity(entry.inwardQuantity)}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 text-right">
                  {formatStockQuantity(entry.outwardQuantity)}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 text-right font-semibold">
                  {formatStockQuantity(entry.closingQuantity)}
                </td>
                <td className="border-b border-r border-slate-300 px-1.5 py-1.5 text-right">
                  {formatStockStatementMoney(entry.purchaseValue)}
                </td>
                <td className="border-b border-slate-300 px-1.5 py-1.5 text-right">
                  {formatStockStatementMoney(entry.salesValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="flex justify-between border-x border-b border-slate-500 px-3 py-3">
          <span>
            Products: {statement.total} · Generated {new Date().toLocaleString("en-IN")}
          </span>
          <span className="font-semibold">For {statement.companyName}</span>
        </footer>
      </article>
    </WorkspacePrintSheet>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="border-r border-slate-500 px-1.5 py-2 last:border-r-0">
      <div className="text-[8px] uppercase">{label}</div>
      <div className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>{value}</div>
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
