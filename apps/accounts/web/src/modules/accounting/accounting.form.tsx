import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { Textarea } from "@cxapp/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@cxapp/ui/components/select";
import { cn } from "@cxapp/ui/lib/utils";
import { formatMoney } from "./accounting.services";
import type { Account, AccountingPeriod, JournalEntry, JournalSavePayload } from "./accounting.types";

export type JournalFormDraft = {
  accountingPeriodId: number | null;
  description: string;
  entryDate: string;
  entryNumber: string;
  reference: string;
};

export function AccountingJournalForm({
  accounts,
  errorMessage,
  loading,
  journal,
  periods,
  onSubmit
}: {
  accounts: Account[];
  errorMessage: string;
  loading: boolean;
  journal: JournalEntry | null;
  periods: AccountingPeriod[];
  onSubmit: (payload: JournalSavePayload) => void;
}) {
  const [draft, setDraft] = useState<JournalFormDraft>({
    accountingPeriodId: journal?.accountingPeriodId ?? null,
    description: journal?.description ?? "",
    entryDate: journal?.entryDate ?? new Date().toISOString().slice(0, 10),
    entryNumber: journal?.entryNumber ?? "",
    reference: journal?.reference ?? ""
  });
  const [lines, setLines] = useState(
    journal?.lines.length
      ? journal.lines.map((line) => ({ accountId: line.accountId, credit: line.credit, debit: line.debit, description: line.description ?? "" }))
      : [{ accountId: 0, credit: 0, debit: 0, description: "" }]
  );

  const postableAccounts = useMemo(
    () => accounts.filter((account) => account.isPostable && !account.isGroup && account.status === "active"),
    [accounts]
  );

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return { balance: debit - credit, credit, debit };
  }, [lines]);

  function updateLine(index: number, patch: Partial<(typeof lines)[number]>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { accountId: 0, credit: 0, debit: 0, description: "" }]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  function submit(status: "draft" | "ready_to_post") {
    const entryNumber = draft.entryNumber.trim();
    if (!entryNumber) {
      toast.error("Entry number is required");
      return;
    }
    if (!draft.entryDate) {
      toast.error("Entry date is required");
      return;
    }
    const cleaned = lines.filter((line) => line.accountId > 0 && (Number(line.debit) || 0) > 0 && (Number(line.credit) || 0) > 0);
    if (cleaned.length < 2) {
      toast.error("A journal entry requires at least two balanced lines");
      return;
    }
    const totalDebit = cleaned.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = cleaned.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      toast.error("Journal entries must balance: total debits must equal total credits");
      return;
    }
    onSubmit({
      accountingPeriodId: draft.accountingPeriodId,
      companyId: journal?.companyId ?? 0,
      description: draft.description,
      entryDate: draft.entryDate,
      entryNumber,
      financialYearId: journal?.financialYearId ?? 0,
      lines: cleaned.map((line) => ({ accountId: line.accountId, credit: line.credit, debit: line.debit, description: line.description })),
      reference: draft.reference,
      status
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{journal ? `Edit ${journal.entryNumber}` : "New journal entry"}</h2>
          <p className="text-sm text-muted-foreground">
            Create balanced double-entry journal entries for your accounting period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => submit("draft")} type="button" variant="outline">
            Save draft
          </Button>
          <Button disabled={loading} onClick={() => submit("ready_to_post")} type="button">
            {loading ? "Saving…" : "Save & submit"}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-md border border-border/70 bg-card shadow-sm">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entry-number">Entry number</Label>
            <Input
              id="entry-number"
              onChange={(event) => setDraft((current) => ({ ...current, entryNumber: event.target.value }))}
              placeholder="JE-0001"
              value={draft.entryNumber}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entry-date">Entry date</Label>
            <Input
              id="entry-date"
              onChange={(event) => setDraft((current) => ({ ...current, entryDate: event.target.value }))}
              type="date"
              value={draft.entryDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period">Accounting period</Label>
            <Select
              onValueChange={(value) => setDraft((current) => ({ ...current, accountingPeriodId: value ? Number(value) : null }))}
              {...(draft.accountingPeriodId ? { value: String(draft.accountingPeriodId) } : {})}
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={String(period.periodId)}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))}
              placeholder="Optional reference"
              value={draft.reference}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="What does this journal entry record?"
              value={draft.description}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <span className="text-sm font-semibold">Journal lines</span>
          <Button onClick={addLine} size="sm" type="button" variant="outline">
            <Plus className="size-4" />
            Add line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Account", "Debit", "Credit", "Narration", ""].map((heading) => (
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
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-border/70 last:border-b-0">
                  <td className="min-w-56 px-4 py-2">
                    <Select
                      onValueChange={(value) => updateLine(index, { accountId: Number(value) })}
                      {...(line.accountId ? { value: String(line.accountId) } : {})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {postableAccounts.map((account) => (
                          <SelectItem key={account.id} value={String(account.accountId)}>
                            {account.code} · {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="w-32 px-4 py-2">
                    <Input
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => updateLine(index, { debit: Number(event.target.value) })}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={line.debit || ""}
                    />
                  </td>
                  <td className="w-32 px-4 py-2">
                    <Input
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => updateLine(index, { credit: Number(event.target.value) })}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={line.credit || ""}
                    />
                  </td>
                  <td className="min-w-40 px-4 py-2">
                    <Input
                      onChange={(event) => updateLine(index, { description: event.target.value })}
                      placeholder="Narration"
                      value={line.description}
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      aria-label="Remove line"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(index)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40">
              <tr>
                <td className="px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Total</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(totals.debit)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(totals.credit)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 border-t border-border/70 px-4 py-2.5 text-sm",
            Math.abs(totals.balance) > 0.001 ? "text-rose-600" : "text-emerald-600"
          )}
        >
          <span className="font-medium">Balance:</span>
          <span>{formatMoney(totals.balance)}</span>
          <span className="text-muted-foreground">
            {Math.abs(totals.balance) > 0.001 ? "(unbalanced — debits must equal credits)" : "(balanced)"}
          </span>
        </div>
      </div>
    </div>
  );
}