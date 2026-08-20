import { Printer } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspaceRowActions } from "@cxapp/ui/workspace/row-actions";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import { formatDate, formatMoney } from "./accounting.services";
import type { BookRegisterLine } from "./accounting.types";

export function BookEntryList({
  entries,
  kind,
  loading,
  onPrint,
  onView,
  visibleColumns
}: {
  entries: BookRegisterLine[];
  kind: "cash" | "bank";
  loading: boolean;
  onPrint: (entry: BookRegisterLine) => void;
  onView: (entry: BookRegisterLine) => void;
  visibleColumns: Record<string, boolean>;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Entry",
                ...(visibleColumns.date ? ["Date"] : []),
                ...(visibleColumns.account ? ["Account"] : []),
                ...(visibleColumns.description ? ["Description"] : []),
                ...(visibleColumns.receipt ? [kind === "cash" ? "Cash In" : "Receipt"] : []),
                ...(visibleColumns.payment ? [kind === "cash" ? "Cash Out" : "Payment"] : []),
                ...(visibleColumns.balance ? ["Balance"] : []),
                "Print",
                ...(visibleColumns.action ? ["Action"] : [])
              ].map((heading) => (
                <th
                  className={cn(
                    "border-b border-border/70 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    ["Receipt", "Payment", "Cash In", "Cash Out", "Balance"].includes(heading)
                      ? "text-right"
                      : heading === "Print"
                        ? "text-center"
                        : "text-left"
                  )}
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
                className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
                key={entry.id}
              >
                <td className="px-4 py-2.5">
                  <button
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                    onClick={() => onView(entry)}
                    type="button"
                  >
                    {entry.entryNumber}
                  </button>
                </td>
                {visibleColumns.date ? (
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(entry.entryDate)}</td>
                ) : null}
                {visibleColumns.account ? (
                  <td className="px-4 py-2.5">
                    {entry.accountCode} · {entry.accountName}
                  </td>
                ) : null}
                {visibleColumns.description ? (
                  <td className="max-w-72 truncate px-4 py-2.5 text-muted-foreground">
                    {entry.description}
                  </td>
                ) : null}
                {visibleColumns.receipt ? (
                  <td className="px-4 py-2.5 text-right">
                    {entry.debit ? formatMoney(entry.debit) : "—"}
                  </td>
                ) : null}
                {visibleColumns.payment ? (
                  <td className="px-4 py-2.5 text-right">
                    {entry.credit ? formatMoney(entry.credit) : "—"}
                  </td>
                ) : null}
                {visibleColumns.balance ? (
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatMoney(entry.balance)}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-center">
                  <Button
                    aria-label={`Print ${entry.entryNumber}`}
                    className="size-8"
                    onClick={() => onPrint(entry)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Printer className="size-4" />
                  </Button>
                </td>
                {visibleColumns.action ? (
                  <td className="px-4 py-2.5">
                    <WorkspaceRowActions
                      actions={[]}
                      onView={() => onView(entry)}
                      title={entry.entryNumber}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!entries.length && !loading ? (
        <WorkspaceTableEmptyState>No {kind} entries found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
