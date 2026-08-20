import { Printer } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspaceShowCard } from "@cxapp/ui/workspace/show";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import { formatDate, formatMoney } from "./accounting.services";
import type { BookEntry, BookRegisterLine, JournalEntry } from "./accounting.types";

export function BookEntryShow({
  entry,
  source,
  kind,
  onBack
}: {
  entry: BookRegisterLine;
  source: BookEntry | JournalEntry;
  kind: "cash" | "bank";
  onBack: () => void;
}) {
  const isBookEntry = "account" in source;
  const type = isBookEntry
    ? source.type === "receipt"
      ? kind === "cash"
        ? "Cash In"
        : "Receipt"
      : kind === "cash"
        ? "Cash Out"
        : "Payment"
    : entry.debit > 0
      ? kind === "cash"
        ? "Cash In"
        : "Receipt"
      : kind === "cash"
        ? "Cash Out"
        : "Payment";
  const amount = isBookEntry ? source.amount : entry.debit || entry.credit;
  const counterpart = isBookEntry
    ? source.counterpart
    : source.lines.find((line) => line.accountId !== entry.accountId);
  const counterpartLabel = counterpart
    ? "code" in counterpart
      ? `${counterpart.code} · ${counterpart.name}`
      : `${counterpart.accountCode} · ${counterpart.accountName}`
    : "—";
  return (
    <WorkspacePage
      action={
        <Button onClick={() => window.print()} type="button" variant="outline">
          <Printer className="size-4" />
          Print
        </Button>
      }
      description={`${type} · ${formatDate(entry.entryDate)}`}
      onBack={onBack}
      title={entry.entryNumber}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceShowCard title={`${kind === "cash" ? "Cash" : "Bank"} entry`}>
          <dl className="grid gap-3 p-5 text-sm">
            <Summary label="Entry type" value={type} />
            <Summary label="Account" value={`${entry.accountCode} · ${entry.accountName}`} />
            <Summary label="Counterpart" value={counterpartLabel} />
            <Summary label="Amount" value={formatMoney(amount)} />
            <Summary label="Remarks / Notes" value={source.reference || "—"} />
          </dl>
        </WorkspaceShowCard>
        <WorkspaceShowCard title="Posting details">
          <dl className="grid gap-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <WorkspaceStatusBadge status={source.status} />
              </dd>
            </div>
            <Summary label="Date" value={formatDate(source.entryDate)} />
            <Summary
              label="Debit"
              value={formatMoney(isBookEntry ? source.amount : source.totalDebit)}
            />
            <Summary
              label="Credit"
              value={formatMoney(isBookEntry ? source.amount : source.totalCredit)}
            />
            <Summary label="Description" value={source.description || "—"} />
          </dl>
        </WorkspaceShowCard>
      </div>
    </WorkspacePage>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
