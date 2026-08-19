import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@cxapp/ui/components/select";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import { useAccountingContext, useAccounts, useBookRegister } from "./accounting.hooks";
import { formatDate, formatMoney, postBookEntry } from "./accounting.services";
import type { AccountContext, BookEntryPayload, BookEntryType } from "./accounting.types";

export function BookWorkspace({
  kind,
  title,
  description,
  technicalName
}: {
  kind: "cash" | "bank";
  title: string;
  description: string;
  technicalName: string;
}) {
  const queryClient = useQueryClient();
  const contextQuery = useAccountingContext();
  const registerQuery = useBookRegister(kind);
  const accountsQuery = useAccounts();
  const register = registerQuery.data;

  const [draft, setDraft] = useState<{
    accountId: string;
    amount: string;
    counterpartAccountId: string;
    description: string;
    entryDate: string;
    entryNumber: string;
    reference: string;
    type: BookEntryType;
  }>({
    accountId: "",
    amount: "",
    counterpartAccountId: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
    entryNumber: "",
    reference: "",
    type: "receipt"
  });

  const bookAccounts = useMemo(() => register?.accounts ?? [], [register]);
  const counterpartAccounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (account) => !account.isGroup && account.isPostable && account.status === "active"
      ),
    [accountsQuery.data]
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "book", kind] });
    await queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "accounts"] });
    await queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "journals"] });
  };

  const entryMutation = useMutation({
    mutationFn: (payload: BookEntryPayload) => postBookEntry(kind, payload),
    onSuccess: async (journal) => {
      await invalidate();
      toast.success("Entry posted", { description: `${journal.entryNumber} was recorded.` });
      setDraft((current) => ({
        ...current,
        accountId: "",
        amount: "",
        counterpartAccountId: "",
        description: "",
        entryNumber: "",
        reference: ""
      }));
    },
    onError: (error) => {
      toast.error("Entry could not be posted", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  function submit() {
    const context: AccountContext | undefined = contextQuery.data;
    if (!context) {
      toast.error("Accounting context is not available");
      return;
    }
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    if (!draft.accountId) {
      toast.error("Select a cash or bank account");
      return;
    }
    if (!draft.counterpartAccountId) {
      toast.error("Select a counterpart account");
      return;
    }
    if (!draft.entryDate) {
      toast.error("Entry date is required");
      return;
    }
    if (!draft.description.trim()) {
      toast.error("Description is required");
      return;
    }
    const payload: BookEntryPayload = {
      accountId: draft.accountId,
      amount,
      companyId: context.companyId,
      counterpartAccountId: draft.counterpartAccountId,
      description: draft.description.trim(),
      entryDate: draft.entryDate,
      financialYearId: context.financialYearId,
      type: draft.type
    };
    if (draft.entryNumber.trim()) payload.entryNumber = draft.entryNumber.trim();
    if (draft.reference.trim()) payload.reference = draft.reference.trim();
    entryMutation.mutate(payload);
  }

  return (
    <WorkspacePage
      title={title}
      description={description}
      technicalName={technicalName}
      actions={
        <Button
          className="h-9 rounded-md"
          disabled={registerQuery.isFetching}
          onClick={() => void registerQuery.refetch()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={cn("size-4", registerQuery.isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <WorkspaceTablePanel>
        <div className="flex flex-wrap items-center gap-6 px-4 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">Opening balance</span>
            <div className="font-medium text-foreground">{formatMoney(register?.openingBalance ?? 0)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Closing balance</span>
            <div className="font-semibold text-foreground">{formatMoney(register?.closingBalance ?? 0)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Accounts</span>
            <div className="font-medium text-foreground">{bookAccounts.length}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Transactions</span>
            <div className="font-medium text-foreground">{register?.lines.length ?? 0}</div>
          </div>
        </div>
      </WorkspaceTablePanel>

      <div className="mb-3 px-1">
        <h2 className="text-lg font-semibold">Record {kind === "cash" ? "cash" : "bank"} entry</h2>
        <p className="text-sm text-muted-foreground">
          Post a balanced receipt or payment to the {kind === "cash" ? "cash" : "bank"} book.
        </p>
      </div>
      <WorkspaceTablePanel>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="book-type">Type</Label>
            <Select
              onValueChange={(value) => setDraft((current) => ({ ...current, type: value as BookEntryType }))}
              value={draft.type}
            >
              <SelectTrigger id="book-type">
                <SelectValue placeholder="Receipt or payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt (money in)</SelectItem>
                <SelectItem value="payment">Payment (money out)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-account">{kind === "cash" ? "Cash" : "Bank"} account</Label>
            <Select
              onValueChange={(value) => setDraft((current) => ({ ...current, accountId: value }))}
              {...(draft.accountId ? { value: draft.accountId } : {})}
            >
              <SelectTrigger id="book-account">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {bookAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-counterpart">Counterpart account</Label>
            <Select
              onValueChange={(value) => setDraft((current) => ({ ...current, counterpartAccountId: value }))}
              {...(draft.counterpartAccountId ? { value: draft.counterpartAccountId } : {})}
            >
              <SelectTrigger id="book-counterpart">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {counterpartAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} · {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-amount">Amount</Label>
            <Input
              id="book-amount"
              inputMode="decimal"
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              placeholder="0.00"
              type="number"
              value={draft.amount}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-date">Date</Label>
            <Input
              id="book-date"
              onChange={(event) => setDraft((current) => ({ ...current, entryDate: event.target.value }))}
              type="date"
              value={draft.entryDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-description">Description</Label>
            <Input
              id="book-description"
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="What is this for?"
              value={draft.description}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-reference">Reference</Label>
            <Input
              id="book-reference"
              onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))}
              placeholder="Optional ref no."
              value={draft.reference}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              className="h-9 flex-1"
              disabled={entryMutation.isPending}
              onClick={submit}
              type="button"
            >
              {entryMutation.isPending ? "Posting…" : "Post entry"}
            </Button>
          </div>
        </div>
      </WorkspaceTablePanel>

      {registerQuery.isLoading ? (
        <WorkspaceTablePanel>
          <WorkspaceTableLoadingState />
        </WorkspaceTablePanel>
      ) : null}

      {registerQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {registerQuery.error instanceof Error ? registerQuery.error.message : "The register could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}

      {register && register.lines.length === 0 ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>No transactions recorded in this book yet.</WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}

      {register && register.lines.length > 0 ? (
        <WorkspaceTablePanel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Entry", "Account", "Description", "Debit", "Credit", "Balance"].map((heading) => (
                    <th
                      key={heading}
                      className={cn(
                        "border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        ["Debit", "Credit", "Balance"].includes(heading) ? "text-right" : "text-left"
                      )}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {register.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(line.entryDate)}</td>
                    <td className="px-4 py-2.5 font-medium">{line.entryNumber}</td>
                    <td className="px-4 py-2.5">{line.accountCode} · {line.accountName}</td>
                    <td className="max-w-72 truncate px-4 py-2.5 text-muted-foreground">{line.description}</td>
                    <td className="px-4 py-2.5 text-right">{line.debit ? formatMoney(line.debit) : "—"}</td>
                    <td className="px-4 py-2.5 text-right">{line.credit ? formatMoney(line.credit) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(line.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkspaceTablePanel>
      ) : null}
    </WorkspacePage>
  );
}