import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { formatSupplierSummaryMoney } from "./supplier-summary.services";
import type { SupplierSummaryItem } from "./supplier-summary.types";

export function SupplierSummaryList({
  entries,
  loading
}: {
  entries: SupplierSummaryItem[];
  loading: boolean;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                { label: "Supplier", align: "text-left" },
                { label: "Code", align: "text-left" },
                { label: "Debit", align: "text-right" },
                { label: "Credit", align: "text-right" },
                { label: "Balance", align: "text-right" }
              ].map((heading) => (
                <th
                  className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${heading.align}`}
                  key={heading.label}
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                className="border-b border-border/70 last:border-b-0 hover:bg-muted/20"
                key={entry.id}
              >
                <td className="px-4 py-3 font-semibold">{entry.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{entry.code || "-"}</td>
                <td className="px-4 py-3 text-right">{formatSupplierSummaryMoney(entry.debit)}</td>
                <td className="px-4 py-3 text-right">{formatSupplierSummaryMoney(entry.credit)}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">
                  {formatSupplierSummaryMoney(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!entries.length && !loading ? (
        <WorkspaceTableEmptyState>No supplier outstanding balances found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
