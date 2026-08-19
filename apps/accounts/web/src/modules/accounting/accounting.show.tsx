import { ArrowLeft, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { cn } from "@cxapp/ui/lib/utils";
import { formatDate, formatMoney } from "./accounting.services";
import { JournalStatusPill } from "./accounting.list";
import type { JournalEntry } from "./accounting.types";

export function AccountingJournalShow({
  canEdit,
  journal,
  onBack,
  onCancel,
  onDelete,
  onEdit,
  onPost,
  onReverse
}: {
  canEdit: boolean;
  journal: JournalEntry;
  onBack: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPost: () => void;
  onReverse: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back to journal list" onClick={onBack} size="icon" type="button" variant="outline">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{journal.entryNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(journal.entryDate)} · {journal.reference || "No reference"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JournalStatusPill status={journal.status} />
          {canEdit ? (
            <Button onClick={onEdit} size="sm" type="button" variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {journal.status === "ready_to_post" ? (
            <Button onClick={onPost} size="sm" type="button">
              Post
            </Button>
          ) : null}
          {journal.status === "posted" ? (
            <Button onClick={onReverse} size="sm" type="button" variant="outline">
              <RotateCcw className="size-4" />
              Reverse
            </Button>
          ) : null}
          {journal.status === "draft" ? (
            <>
              <Button onClick={onCancel} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={onDelete} size="sm" type="button" variant="outline" className="text-rose-600">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {journal.description ? (
        <div className="rounded-md border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          {journal.description}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["#", "Account", "Narration", "Debit", "Credit"].map((heading) => (
                  <th
                    key={heading}
                    className={cn(
                      "border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      ["Debit", "Credit"].includes(heading) ? "text-right" : "text-left"
                    )}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journal.lines.map((line) => (
                <tr key={line.id || line.lineNumber} className="border-b border-border/70 last:border-b-0">
                  <td className="px-4 py-2.5 text-muted-foreground">{line.lineNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{line.accountCode}</span>
                    <span className="ml-2 text-muted-foreground">{line.accountName}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{line.description}</td>
                  <td className="px-4 py-2.5 text-right">{line.debit ? formatMoney(line.debit) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">{line.credit ? formatMoney(line.credit) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">
                  Total
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(journal.totalDebit)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(journal.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}