import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { BillingDocumentHeader } from "../../settings";
import {
  formatSupplierStatementDate,
  formatSupplierStatementMoney
} from "./supplier-statement.services";
import type { SupplierStatement } from "./supplier-statement.types";

export function SupplierStatementPrint({ statement }: { statement: SupplierStatement }) {
  return (
    <WorkspacePrintSheet className="billing-print-document billing-statement-print-document">
      <style>{printStyles}</style>
      <article className="bg-white px-3 py-3 text-[10px] text-black">
        <BillingDocumentHeader
          className="border border-slate-500"
          documentMeta={
            <>
              {statement.financialYearName} · {formatSupplierStatementDate(statement.from)} to{" "}
              {formatSupplierStatementDate(statement.to)}
            </>
          }
          documentTitle="Supplier Statement"
        />
        <section className="grid grid-cols-2 border-x border-b border-slate-500 px-3 py-2">
          <div>
            <span className="font-semibold">Supplier: </span>
            {statement.selectedContact?.name ?? "-"}
          </div>
          <div className="text-right">
            <span className="font-semibold">GSTIN: </span>
            {statement.selectedContact?.gstin || "-"}
          </div>
          <div>
            <span className="font-semibold">Code: </span>
            {statement.selectedContact?.code || "-"}
          </div>
          <div className="text-right">Movements: {statement.total}</div>
        </section>
        <section className="grid grid-cols-4 border-x border-b border-slate-500">
          <PrintTotal label="Opening Balance" value={statement.openingBalance} />
          <PrintTotal label="Payment Debit" value={statement.periodDebit} />
          <PrintTotal label="Purchase Credit" value={statement.periodCredit} />
          <PrintTotal label="Closing Balance" strong value={statement.closingBalance} />
        </section>
        <table className="w-full border-collapse border-x border-b border-slate-500">
          <thead>
            <tr>
              {["Date", "Voucher", "Type", "Narration", "Debit", "Credit", "Balance"].map(
                (heading) => (
                  <th
                    className="border-b border-r border-slate-500 px-2 py-2 text-left last:border-r-0"
                    key={heading}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {statement.items.map((entry) => (
              <tr key={`${entry.kind}-${entry.documentId}`}>
                <td className="whitespace-nowrap border-b border-r border-slate-300 px-2 py-1.5">
                  {formatSupplierStatementDate(entry.date)}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 font-semibold">
                  {entry.documentNumber}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 capitalize">
                  {entry.kind}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5">
                  {entry.narration}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {entry.debit ? formatSupplierStatementMoney(entry.debit) : "-"}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {entry.credit ? formatSupplierStatementMoney(entry.credit) : "-"}
                </td>
                <td className="border-b border-slate-300 px-2 py-1.5 text-right font-semibold">
                  {formatSupplierStatementMoney(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="flex justify-between border-x border-b border-slate-500 px-3 py-3">
          <span>Generated {new Date().toLocaleString("en-IN")}</span>
          <span className="font-semibold">For {statement.companyName}</span>
        </footer>
      </article>
    </WorkspacePrintSheet>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="border-r border-slate-500 px-2 py-2 last:border-r-0">
      <div className="text-[9px] uppercase">{label}</div>
      <div className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>
        {formatSupplierStatementMoney(value)}
      </div>
    </div>
  );
}

const printStyles = `@media print { .billing-statement-print-document { break-inside: auto !important; } .billing-statement-print-document thead { display: table-header-group; } .billing-statement-print-document tr { break-inside: avoid; } }`;
