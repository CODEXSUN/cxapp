import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import { formatGstStatementMoney } from "./gst-statement.services";
import type { GstStatementLine } from "./gst-statement.types";

export function GstStatementList({
  entries,
  loading
}: {
  entries: GstStatementLine[];
  loading: boolean;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Direction",
                "GST rate",
                "Documents",
                "Taxable",
                "CGST",
                "SGST",
                "IGST",
                "Tax total"
              ].map((heading) => (
                <th
                  className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${["GST rate", "Documents", "Taxable", "CGST", "SGST", "IGST", "Tax total"].includes(heading) ? "text-right" : "text-left"}`}
                  key={heading}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                className="border-b border-border/70 last:border-b-0 hover:bg-muted/20"
                key={`${entry.direction}-${entry.taxRate}`}
              >
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={entry.direction === "outward" ? "Outward" : "Inward"}
                    tone={entry.direction === "outward" ? "info" : "success"}
                  />
                </td>
                <td className="px-4 py-3 text-right font-semibold">{entry.taxRate}%</td>
                <td className="px-4 py-3 text-right">{entry.documentCount}</td>
                <td className="px-4 py-3 text-right">
                  {formatGstStatementMoney(entry.taxableAmount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatGstStatementMoney(entry.cgstAmount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatGstStatementMoney(entry.sgstAmount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatGstStatementMoney(entry.igstAmount)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatGstStatementMoney(entry.taxAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!entries.length && !loading ? (
        <WorkspaceTableEmptyState>No confirmed GST movements found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
