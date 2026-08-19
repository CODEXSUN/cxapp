import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@cxapp/ui/components/select";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspaceTableEmptyState, WorkspaceTablePanel } from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import { useAccounts, useLedger } from "./accounting.hooks";
import { formatDate, formatMoney } from "./accounting.services";

export function AccountingLedgerWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  const accountsQuery = useAccounts();
  const postable = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => !account.isGroup && account.isPostable),
    [accountsQuery.data]
  );
  const [selectedId, setSelectedId] = useState(initialRecordId ?? "");
  const ledgerQuery = useLedger(selectedId || null);

  useEffect(() => {
    if (initialRecordId && !selectedId) setSelectedId(initialRecordId);
  }, [initialRecordId, selectedId]);

  const selected = postable.find((account) => account.id === selectedId);
  const ledger = ledgerQuery.data;

  return (
    <WorkspacePage
      title="Ledger"
      description="Select a ledger account to view its posted transactions and running balance."
      technicalName="page.accounts.ledger"
      actions={
        <Button
          className="h-9 rounded-md"
          disabled={ledgerQuery.isFetching || !selectedId}
          onClick={() => void ledgerQuery.refetch()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={cn("size-4", ledgerQuery.isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="max-w-md">
        <Select onValueChange={setSelectedId} {...(selectedId ? { value: selectedId } : {})}>
          <SelectTrigger id="ledger-account">
            <SelectValue placeholder="Select a ledger account" />
          </SelectTrigger>
          <SelectContent>
            {postable.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.code} · {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected ? (
        <div className="mt-4 flex flex-wrap items-center gap-6 rounded-md border border-border/70 bg-card px-4 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">Opening balance</span>
            <div className="font-medium text-foreground">{formatMoney(ledger?.account.openingBalance ?? 0)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Closing balance</span>
            <div className="font-semibold text-foreground">{formatMoney(ledger?.closingBalance ?? 0)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Transactions</span>
            <div className="font-medium text-foreground">{ledger?.lines.length ?? 0}</div>
          </div>
        </div>
      ) : null}

      {ledgerQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : "Ledger could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}

      {selectedId && ledger && ledger.lines.length === 0 && !ledgerQuery.isFetching ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>No posted transactions for this account.</WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}

      {selectedId && ledger && ledger.lines.length > 0 ? (
        <WorkspaceTablePanel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Entry", "Description", "Debit", "Credit", "Balance"].map((heading) => (
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
                {ledger.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(line.entryDate)}</td>
                    <td className="px-4 py-2.5 font-medium">{line.entryNumber}</td>
                    <td className="max-w-72 truncate px-4 py-2.5 text-muted-foreground">
                      {line.accountName}
                    </td>
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

      {!selectedId ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>Select a ledger account to view its register.</WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
    </WorkspacePage>
  );
}