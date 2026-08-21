import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxapp/ui/components/button";
import { WorkspaceFilters } from "@cxapp/ui/workspace/filters";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { WorkspacePagination } from "@cxapp/ui/workspace/pagination";
import { WorkspaceTableEmptyState, WorkspaceTablePanel } from "@cxapp/ui/workspace/table";
import { buildShowingLabel } from "@cxapp/ui/workspace/utils";
import { cn } from "@cxapp/ui/lib/utils";
import {
  useAccountingContext,
  useAccounts,
  useBookRegister,
  useCashBookContext,
  useCashBookLedgerGroups,
  useCashBookLedgers
} from "./accounting.hooks";
import { BookEntryForm } from "./accounting.book-form";
import { BookEntryList } from "./accounting.book-list";
import { BookEntryShow } from "./accounting.book-show";
import {
  createCashBookLedger,
  createCoreLedgerGroup,
  formatMoney,
  getBookEntry,
  getJournal,
  postBookEntry
} from "./accounting.services";
import type {
  BookEntry,
  BookEntryPayload,
  BookRegisterLine,
  JournalEntry
} from "./accounting.types";

type BookView =
  | { mode: "list" }
  | { mode: "upsert" }
  | { entry: BookRegisterLine; source: BookEntry | JournalEntry; mode: "show" };

const bookColumnCatalog = [
  { id: "date", label: "Date" },
  { id: "account", label: "Account" },
  { id: "description", label: "Description" },
  { id: "receipt", label: "Receipt" },
  { id: "payment", label: "Payment" },
  { id: "balance", label: "Balance" },
  { id: "action", label: "Action" }
] as const;

export function BookWorkspace({
  description,
  kind,
  technicalName,
  title
}: {
  description: string;
  kind: "cash" | "bank";
  technicalName: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const contextQuery = useAccountingContext();
  const accountsQuery = useAccounts();
  const registerQuery = useBookRegister(kind);
  const cashLedgersQuery = useCashBookLedgers(kind === "cash");
  const cashBookContextQuery = useCashBookContext(kind === "cash");
  const cashLedgerGroupsQuery = useCashBookLedgerGroups(kind === "cash");
  const createLedger = useMutation({ mutationFn: createCashBookLedger });
  const createLedgerGroup = useMutation({ mutationFn: createCoreLedgerGroup });
  const entryFilters = useMemo(
    () => [
      { id: "all", label: "All entries" },
      { id: "receipt", label: kind === "cash" ? "Cash In" : "Receipts" },
      { id: "payment", label: kind === "cash" ? "Cash Out" : "Payments" }
    ],
    [kind]
  );
  const columnCatalog = useMemo(
    () =>
      bookColumnCatalog.map((column) =>
        column.id === "receipt"
          ? { ...column, label: kind === "cash" ? "Cash In" : "Receipt" }
          : column.id === "payment"
            ? { ...column, label: kind === "cash" ? "Cash Out" : "Payment" }
            : column
      ),
    [kind]
  );
  const [view, setView] = useState<BookView>({ mode: "list" });
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(bookColumnCatalog.map((column) => [column.id, true]))
  );
  const register = registerQuery.data;
  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (register?.lines ?? []).filter((entry) => {
      const matchesType =
        entryFilter === "all" || (entryFilter === "receipt" ? entry.debit > 0 : entry.credit > 0);
      const matchesSearch =
        !query ||
        [
          entry.entryNumber,
          entry.accountCode,
          entry.accountName,
          entry.description,
          entry.entryDate
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesType && matchesSearch;
    });
  }, [entryFilter, register?.lines, search]);
  const totalPages = Math.max(1, Math.ceil(entries.length / rowsPerPage));
  const pageEntries = entries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const pageTotals = pageEntries.reduce(
    (totals, entry) => ({
      receipt: totals.receipt + entry.debit,
      payment: totals.payment + entry.credit
    }),
    { payment: 0, receipt: 0 }
  );

  const save = useMutation({
    mutationFn: (payload: BookEntryPayload) => postBookEntry(kind, payload),
    onSuccess: async (posted) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "book", kind] }),
        queryClient.invalidateQueries({
          queryKey: ["accounts", "accounting", "cash-book", "context"]
        }),
        queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "journals"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "ledger"] })
      ]);
      const refreshed = await registerQuery.refetch();
      const entry = refreshed.data?.lines.find((line) => line.sourceId === posted.id);
      toast.success(`${kind === "cash" ? "Cash" : "Bank"} entry posted`, {
        description: posted.entryNumber
      });
      setView(entry ? { entry, source: posted, mode: "show" } : { mode: "list" });
    },
    onError: (error) => toast.error("Entry could not be posted", { description: message(error) })
  });

  async function openEntry(entry: BookRegisterLine, print = false) {
    try {
      const source =
        entry.sourceType === "journal"
          ? await getJournal(entry.sourceId)
          : await getBookEntry(kind, entry.sourceId);
      setView({ entry, source, mode: "show" });
      if (print)
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
    } catch (error) {
      toast.error("Entry could not be opened", { description: message(error) });
    }
  }

  if (view.mode === "upsert")
    return (
      <BookEntryForm
        accounts={accountsQuery.data ?? []}
        bookAccounts={register?.accounts ?? []}
        context={contextQuery.data ?? null}
        cashBookContext={cashBookContextQuery.data ?? null}
        cashLedgers={cashLedgersQuery.data ?? []}
        cashLedgersLoading={cashLedgersQuery.isLoading}
        creatingLedger={createLedger.isPending}
        {...(save.error ? { error: message(save.error) } : {})}
        kind={kind}
        ledgerGroups={cashLedgerGroupsQuery.data ?? []}
        onBack={() => setView({ mode: "list" })}
        onSave={(payload) => save.mutate(payload)}
        onCreateLedger={async (payload) => {
          const created = await createLedger.mutateAsync(payload);
          await cashLedgersQuery.refetch();
          toast.success("Ledger created", { description: created.name });
          return created;
        }}
        onCreateLedgerGroup={async (payload) => {
          const created = await createLedgerGroup.mutateAsync(payload);
          await cashLedgerGroupsQuery.refetch();
          toast.success("Ledger group created", { description: created.name });
          return created;
        }}
        saving={save.isPending}
      />
    );

  if (view.mode === "show")
    return (
      <BookEntryShow
        entry={view.entry}
        source={view.source}
        kind={kind}
        onBack={() => setView({ mode: "list" })}
      />
    );

  return (
    <WorkspacePage
      action={
        <div className="flex gap-2">
          <Button
            disabled={registerQuery.isFetching}
            onClick={() => void registerQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", registerQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setView({ mode: "upsert" })} type="button">
            <Plus className="size-4" />
            New {kind} entry
          </Button>
        </div>
      }
      description={description}
      technicalName={technicalName}
      title={title}
    >
      <WorkspaceFilters
        columnOptions={columnCatalog.map((column) => ({
          ...column,
          checked: Boolean(visibleColumns[column.id]),
          onCheckedChange: (checked: boolean) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        filterOptions={entryFilters}
        filterValue={entryFilter}
        onFilterValueChange={(value) => {
          setEntryFilter(value);
          setCurrentPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onShowAllColumns={() =>
          setVisibleColumns(Object.fromEntries(columnCatalog.map((column) => [column.id, true])))
        }
        searchPlaceholder={`Search ${kind} entry, account, description, or date`}
        searchValue={search}
      />
      {registerQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>{message(registerQuery.error)}</WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
      {!registerQuery.isError ? (
        <BookEntryList
          entries={pageEntries}
          kind={kind}
          loading={registerQuery.isLoading}
          onPrint={(entry) => void openEntry(entry, true)}
          onView={(entry) => void openEntry(entry)}
          visibleColumns={visibleColumns}
        />
      ) : null}
      <WorkspaceTablePanel>
        <div className="flex flex-wrap items-center justify-between gap-6 px-4 py-2.5 text-sm">
          <Balance label="Opening balance" value={formatMoney(register?.openingBalance ?? 0)} />
          <Balance
            label={kind === "cash" ? "Total Cash In" : "Total receipts"}
            value={formatMoney(pageTotals.receipt)}
          />
          <Balance
            label={kind === "cash" ? "Total Cash Out" : "Total payments"}
            value={formatMoney(pageTotals.payment)}
          />
          <Balance
            label="Closing balance"
            strong
            value={formatMoney(register?.closingBalance ?? 0)}
          />
        </div>
      </WorkspaceTablePanel>
      <WorkspacePagination
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, entries.length)}
        singularLabel={`${kind} entries`}
        totalCount={entries.length}
        totalPages={totalPages}
      />
    </WorkspacePage>
  );
}

function Balance({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className={cn("font-medium text-foreground", strong && "font-semibold")}>{value}</div>
    </div>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected Accounts error occurred.";
}
