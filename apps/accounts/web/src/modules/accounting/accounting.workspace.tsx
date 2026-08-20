import { useEffect, useMemo, useState } from "react";
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
import { getCompanyId, getFinancialYearId } from "../../shared/api/tenant-context";
import {
  cancelJournal,
  createJournal,
  deleteJournal,
  getJournal,
  postJournal,
  reverseJournal,
  updateJournal
} from "./accounting.services";
import {
  useAccounts,
  useAccountingContext,
  useAccountingPeriods,
  useJournalsPage
} from "./accounting.hooks";
import { AccountingJournalForm } from "./accounting.form";
import { AccountingJournalShow } from "./accounting.show";
import { AccountingJournalsList, BalanceSummary } from "./accounting.list";
import type { JournalEntry, JournalSavePayload } from "./accounting.types";

const statusFilters = [
  { id: "all", label: "All entries" },
  { id: "draft", label: "Draft" },
  { id: "ready_to_post", label: "Ready to post" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" },
  { id: "reversed", label: "Reversed" }
];

const journalColumnCatalog = [
  { id: "date", label: "Date" },
  { id: "reference", label: "Reference" },
  { id: "description", label: "Description" },
  { id: "debit", label: "Debit" },
  { id: "credit", label: "Credit" },
  { id: "status", label: "Status" },
  { id: "action", label: "Action" }
] as const;

type JournalView =
  | { mode: "list" }
  | { mode: "show"; journal: JournalEntry }
  | { mode: "upsert"; journal: JournalEntry | null; returnTo: "list" | "show" };

export function AccountingWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  const queryClient = useQueryClient();
  const contextQuery = useAccountingContext();
  const periodsQuery = useAccountingPeriods();
  const accountsQuery = useAccounts();
  const [view, setView] = useState<JournalView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(journalColumnCatalog.map((column) => [column.id, true]))
  );
  const journalsQuery = useJournalsPage({
    page: currentPage,
    pageSize: rowsPerPage,
    search: searchValue,
    status: statusFilter
  });

  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();

  useEffect(() => {
    if (!initialRecordId) return;
    let active = true;
    void getJournal(initialRecordId)
      .then((journal) => {
        if (active) setView({ mode: "show", journal });
      })
      .catch((error) => {
        if (active)
          toast.error("Journal could not be opened", {
            description: error instanceof Error ? error.message : "Please try again."
          });
      });
    return () => {
      active = false;
    };
  }, [initialRecordId]);

  const invalidateJournals = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "journals"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts", "accounting", "ledger"] })
    ]);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: JournalSavePayload }) =>
      id ? updateJournal(id, payload) : createJournal(payload),
    onSuccess: async (journal) => {
      await invalidateJournals();
      toast.success(
        view.mode === "upsert" && view.journal ? "Journal updated" : "Journal created",
        {
          description: `${journal.entryNumber} is ready.`
        }
      );
      setView({ mode: "show", journal });
    },
    onError: (error) => {
      toast.error("Journal save failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postJournal(id),
    onSuccess: async (journal) => {
      await invalidateJournals();
      toast.success("Journal posted", { description: journal.entryNumber });
      setView({ mode: "show", journal });
    },
    onError: (error) => {
      toast.error("Post failed", {
        description:
          error instanceof Error ? error.message : "Only ready-to-post entries can be posted."
      });
    }
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => reverseJournal(id),
    onSuccess: async (journal) => {
      await invalidateJournals();
      toast.success("Journal reversed", { description: journal.entryNumber });
      setView({ mode: "show", journal });
    },
    onError: (error) => {
      toast.error("Reverse failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => cancelJournal(id, "Cancelled by user"),
    onSuccess: async (journal) => {
      await invalidateJournals();
      toast.success("Journal cancelled", { description: journal.entryNumber });
      setView({ mode: "show", journal });
    },
    onError: (error) => {
      toast.error("Cancel failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournal(id),
    onSuccess: async (journal) => {
      await invalidateJournals();
      toast.success("Journal deleted", { description: journal.entryNumber });
      setView({ mode: "list" });
    },
    onError: (error) => {
      toast.error("Journal could not be deleted", {
        description: error instanceof Error ? error.message : "Only draft journals can be deleted."
      });
    }
  });

  const entries = journalsQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((journalsQuery.data?.total ?? 0) / rowsPerPage));
  const pageTotals = useMemo(
    () =>
      entries.reduce(
        (totals, journal) => ({
          credit: totals.credit + journal.totalCredit,
          debit: totals.debit + journal.totalDebit
        }),
        { credit: 0, debit: 0 }
      ),
    [entries]
  );

  function openNew() {
    setView({ mode: "upsert", journal: null, returnTo: "list" });
  }

  if (view.mode === "show") {
    return (
      <AccountingJournalShow
        canEdit={view.journal.status === "draft"}
        journal={view.journal}
        onBack={() => setView({ mode: "list" })}
        onCancel={() => cancelMutation.mutate({ id: view.journal.id })}
        onDelete={() => {
          if (window.confirm(`Delete ${view.journal.entryNumber}? This cannot be undone.`))
            deleteMutation.mutate(view.journal.id);
        }}
        onEdit={() => setView({ mode: "upsert", journal: view.journal, returnTo: "show" })}
        onPost={() => postMutation.mutate(view.journal.id)}
        onReverse={() => {
          if (
            window.confirm(
              `Reverse ${view.journal.entryNumber}? A balanced reversal will be posted.`
            )
          )
            reverseMutation.mutate(view.journal.id);
        }}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <AccountingJournalForm
        accounts={accountsQuery.data ?? []}
        errorMessage={saveMutation.error instanceof Error ? saveMutation.error.message : ""}
        loading={saveMutation.isPending}
        journal={view.journal}
        periods={periodsQuery.data ?? []}
        onSubmit={(payload) => {
          const body = {
            ...payload,
            companyId: view.journal?.companyId ?? companyId ?? 0,
            financialYearId: view.journal?.financialYearId ?? financialYearId ?? 0
          };
          saveMutation.mutate(
            view.journal ? { id: view.journal.id, payload: body } : { payload: body }
          );
        }}
      />
    );
  }

  return (
    <WorkspacePage
      title="Journals"
      description="Create balanced double-entry journal entries, submit, post, and reverse with full audit."
      technicalName="page.accounts.journal"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={journalsQuery.isFetching}
            onClick={() => void journalsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", journalsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={openNew} type="button">
            <Plus className="size-4" />
            New entry
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        columnOptions={journalColumnCatalog.map((column) => ({
          ...column,
          checked: Boolean(visibleColumns[column.id]),
          onCheckedChange: (checked: boolean) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        filterOptions={statusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        onShowAllColumns={() =>
          setVisibleColumns(
            Object.fromEntries(journalColumnCatalog.map((column) => [column.id, true]))
          )
        }
        searchPlaceholder="Search entry, reference, description, date, or status"
        searchValue={searchValue}
      />
      {contextQuery.data ? (
        <div className="text-sm text-muted-foreground">
          {contextQuery.data.companyName} · {contextQuery.data.financialYearName} ·{" "}
          {contextQuery.data.currencyCode}
        </div>
      ) : null}
      {journalsQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {journalsQuery.error instanceof Error
              ? journalsQuery.error.message
              : "Journal entries could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
      <AccountingJournalsList
        entries={entries}
        loading={journalsQuery.isLoading}
        onEdit={(journal) => setView({ mode: "upsert", journal, returnTo: "list" })}
        onPost={(journal) => {
          if (
            window.confirm(
              `Post ${journal.entryNumber}? This will write to the ledger and cannot be edited.`
            )
          )
            postMutation.mutate(journal.id);
        }}
        onReverse={(journal) => {
          if (window.confirm(`Reverse ${journal.entryNumber}? A balanced reversal will be posted.`))
            reverseMutation.mutate(journal.id);
        }}
        onCancel={(journal) => cancelMutation.mutate({ id: journal.id })}
        onDelete={(journal) => {
          if (window.confirm(`Delete ${journal.entryNumber}? This cannot be undone.`))
            deleteMutation.mutate(journal.id);
        }}
        onPrint={(journal) => {
          setView({ mode: "show", journal });
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
        }}
        onView={(journal) => setView({ mode: "show", journal })}
        visibleColumns={visibleColumns}
      />
      <BalanceSummary
        credit={pageTotals.credit}
        debit={pageTotals.debit}
        balance={pageTotals.debit - pageTotals.credit}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, journalsQuery.data?.total ?? 0)}
        singularLabel="journal entries"
        totalCount={journalsQuery.data?.total ?? 0}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
      />
    </WorkspacePage>
  );
}
