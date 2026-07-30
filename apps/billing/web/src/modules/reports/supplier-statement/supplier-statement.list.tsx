import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import {
  formatSupplierStatementDate,
  formatSupplierStatementMoney
} from "./supplier-statement.services";
import type { SupplierStatementLine } from "./supplier-statement.types";

export function SupplierStatementList({
  entries,
  loading
}: {
  entries: SupplierStatementLine[];
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
                  {formatSupplierStatementDate(entry.date)}
                </td>
                <td className="px-4 py-3 font-semibold">{entry.documentNumber}</td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={entry.kind === "payment" ? "Payment" : "Purchase"}
                    tone={entry.kind === "payment" ? "success" : "info"}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{entry.narration}</td>
                <td className="px-4 py-3 text-right">
                  {entry.debit ? formatSupplierStatementMoney(entry.debit) : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {entry.credit ? formatSupplierStatementMoney(entry.credit) : "-"}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatSupplierStatementMoney(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!entries.length && !loading ? (
        <WorkspaceTableEmptyState>No supplier movements found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
