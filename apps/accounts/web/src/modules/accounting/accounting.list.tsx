import { Eye, Printer } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspaceRowActions } from "@cxapp/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import { formatDate, formatMoney } from "./accounting.services";
import type { JournalEntry } from "./accounting.types";

export function AccountingJournalsList({
  entries,
  loading,
  onEdit,
  onPost,
  onReverse,
  onCancel,
  onDelete,
  onPrint,
  onView,
  visibleColumns
}: {
  entries: JournalEntry[];
  loading: boolean;
  onEdit: (journal: JournalEntry) => void;
  onPost: (journal: JournalEntry) => void;
  onReverse: (journal: JournalEntry) => void;
  onCancel: (journal: JournalEntry) => void;
  onDelete: (journal: JournalEntry) => void;
  onPrint: (journal: JournalEntry) => void;
  onView: (journal: JournalEntry) => void;
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
                ...(visibleColumns.reference ? ["Reference"] : []),
                ...(visibleColumns.description ? ["Description"] : []),
                ...(visibleColumns.debit ? ["Debit"] : []),
                ...(visibleColumns.credit ? ["Credit"] : []),
                ...(visibleColumns.status ? ["Status"] : []),
                "Print",
                ...(visibleColumns.action ? ["Action"] : [])
              ].map((heading) => (
                <th
                  key={heading}
                  className={cn(
                    "border-b border-border/70 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    ["Debit", "Credit"].includes(heading)
                      ? "text-right"
                      : heading === "Print"
                        ? "text-center"
                        : "text-left"
                  )}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((journal) => (
              <tr
                key={journal.id}
                className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5">
                  <button
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                    onClick={() => onView(journal)}
                    title="View journal entry"
                    type="button"
                  >
                    {journal.entryNumber}
                  </button>
                </td>
                {visibleColumns.date ? (
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(journal.entryDate)}</td>
                ) : null}
                {visibleColumns.reference ? (
                  <td className="px-4 py-2.5 text-muted-foreground">{journal.reference}</td>
                ) : null}
                {visibleColumns.description ? (
                  <td className="max-w-64 truncate px-4 py-2.5 text-muted-foreground">
                    {journal.description}
                  </td>
                ) : null}
                {visibleColumns.debit ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(journal.totalDebit)}</td>
                ) : null}
                {visibleColumns.credit ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(journal.totalCredit)}</td>
                ) : null}
                {visibleColumns.status ? (
                  <td className="px-4 py-2.5">
                    <JournalStatusPill status={journal.status} />
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-center">
                  <Button
                    aria-label={`Print ${journal.entryNumber}`}
                    className="size-8"
                    onClick={() => onPrint(journal)}
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
                      actions={[
                        ...(journal.status === "draft"
                          ? [
                              {
                                id: "submit",
                                label: "Submit",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onView(journal)
                              }
                            ]
                          : []),
                        ...(journal.status === "ready_to_post"
                          ? [
                              {
                                id: "post",
                                label: "Post",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onPost(journal)
                              }
                            ]
                          : []),
                        ...(journal.status === "posted"
                          ? [
                              {
                                id: "reverse",
                                label: "Reverse",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onReverse(journal)
                              }
                            ]
                          : []),
                        ...(journal.status === "draft"
                          ? [
                              {
                                id: "cancel",
                                label: "Cancel",
                                icon: <Eye className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onCancel(journal)
                              }
                            ]
                          : []),
                        ...(journal.status === "draft"
                          ? [
                              {
                                id: "force-delete",
                                label: "Force delete",
                                icon: <Eye className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onDelete(journal)
                              }
                            ]
                          : [])
                      ]}
                      {...(journal.status === "draft" ? { onEdit: () => onEdit(journal) } : {})}
                      onView={() => onView(journal)}
                      title={journal.entryNumber}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && loading ? <WorkspaceTableLoadingState /> : null}
      {entries.length === 0 && !loading ? (
        <WorkspaceTableEmptyState>No journal entries found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

export function JournalStatusPill({ status }: { status: JournalEntry["status"] }) {
  const tone =
    status === "posted"
      ? "success"
      : status === "reversed"
        ? "info"
        : status === "cancelled"
          ? "danger"
          : status === "ready_to_post"
            ? "warning"
            : "warning";
  return <WorkspaceStatusBadge label={status.replaceAll("_", " ")} tone={tone} />;
}

export function BalanceSummary({
  debit,
  credit,
  balance
}: {
  debit: number;
  credit: number;
  balance: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-md border border-border/70 bg-card px-4 py-2.5 text-sm">
      <SummaryItem label="Total debit" value={formatMoney(debit)} />
      <SummaryItem label="Total credit" value={formatMoney(credit)} />
      <SummaryItem label="Balance" strong value={formatMoney(balance)} />
    </div>
  );
}

function SummaryItem({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-start gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

export function EmptyActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button className="h-9 rounded-md" onClick={onClick} type="button">
      {label}
    </Button>
  );
}
