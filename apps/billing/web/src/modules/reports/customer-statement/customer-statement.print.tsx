import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { BillingDocumentHeader } from "../../settings";
import {
  formatCustomerStatementDate,
  formatCustomerStatementMoney
} from "./customer-statement.services";
import type { CustomerStatement } from "./customer-statement.types";

export function CustomerStatementPrint({ statement }: { statement: CustomerStatement }) {
  return (
    <WorkspacePrintSheet className="billing-print-document billing-statement-print-document">
      <style>{printStyles}</style>
      <article className="bg-white px-3 py-3 text-[10px] text-black">
        <BillingDocumentHeader
          className="border border-slate-500"
          documentMeta={
            <>
              {statement.financialYearName} · {formatCustomerStatementDate(statement.from)} to{" "}
              {formatCustomerStatementDate(statement.to)}
            </>
          }
          documentTitle="Customer Statement"
        />
        <section className="grid grid-cols-2 border-x border-b border-slate-500 px-3 py-2">
          <div>
            <span className="font-semibold">Customer: </span>
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
          <PrintTotal label="Invoice Debit" value={statement.periodDebit} />
          <PrintTotal label="Receipt Credit" value={statement.periodCredit} />
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
                  {formatCustomerStatementDate(entry.date)}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 font-semibold">
                  {entry.documentNumber}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 capitalize">
                  {entry.kind.replace("-", " ")}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5">
                  {entry.narration}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {entry.debit ? formatCustomerStatementMoney(entry.debit) : "-"}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-right">
                  {entry.credit ? formatCustomerStatementMoney(entry.credit) : "-"}
                </td>
                <td className="border-b border-slate-300 px-2 py-1.5 text-right font-semibold">
                  {formatCustomerStatementMoney(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PrintFooter companyName={statement.companyName} />
      </article>
    </WorkspacePrintSheet>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="border-r border-slate-500 px-2 py-2 last:border-r-0">
      <div className="text-[9px] uppercase">{label}</div>
      <div className={strong ? "mt-1 font-bold" : "mt-1 font-semibold"}>
        {formatCustomerStatementMoney(value)}
      </div>
    </div>
  );
}

function PrintFooter({ companyName }: { companyName: string }) {
  return (
    <footer className="flex justify-between border-x border-b border-slate-500 px-3 py-3">
      <span>Generated {new Date().toLocaleString("en-IN")}</span>
      <span className="font-semibold">For {companyName}</span>
    </footer>
  );
}

const printStyles = `@media print { .billing-statement-print-document { break-inside: auto !important; } .billing-statement-print-document thead { display: table-header-group; } .billing-statement-print-document tr { break-inside: avoid; } }`;
