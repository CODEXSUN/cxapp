import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import {
  formatCustomerStatementDate,
  formatCustomerStatementMoney
} from "./customer-statement.services";
import type { CustomerStatementLine } from "./customer-statement.types";

export function CustomerStatementList({
  entries,
  loading
}: {
  entries: CustomerStatementLine[];
  loading: boolean;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Date", "Voucher", "Type", "Narration", "Debit", "Credit", "Balance"].map(
                (heading) => (
                  <th
                    className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${["Debit", "Credit", "Balance"].includes(heading) ? "text-right" : "text-left"}`}
                    key={heading}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                className="border-b border-border/70 last:border-b-0 hover:bg-muted/20"
                key={`${entry.kind}-${entry.documentId}`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  {formatCustomerStatementDate(entry.date)}
                </td>
                <td className="px-4 py-3 font-semibold">{entry.documentNumber}</td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={
                      entry.kind === "receipt"
                        ? "Receipt"
                        : entry.kind === "sale"
                          ? "Sale"
                          : "Export Sale"
                    }
                    tone={entry.kind === "receipt" ? "success" : "info"}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{entry.narration}</td>
                <td className="px-4 py-3 text-right">
                  {entry.debit ? formatCustomerStatementMoney(entry.debit) : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {entry.credit ? formatCustomerStatementMoney(entry.credit) : "-"}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCustomerStatementMoney(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!entries.length && !loading ? (
        <WorkspaceTableEmptyState>No customer movements found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
