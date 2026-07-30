import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceTableEmptyState, WorkspaceTablePanel } from "@codexsun/ui/workspace/table";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { useSalesSettings } from "../settings";
import { defaultBillingSettings } from "../settings/settings.types";
import type { Quotation, QuotationSavePayload, QuotationView } from "./quotation.types";
import { QuotationShowPage } from "./quotation.show";
import {
  createQuotation,
  convertQuotationToSale,
  convertQuotationsToSale,
  deleteQuotation,
  formatMoney,
  revokeQuotation,
  setQuotationStatus,
  totalQuotationQuantity,
  updateQuotation
} from "./quotation.services";
import { useQuotationPage } from "./quotation.hooks";
import { QuotationForm } from "./quotation.form";
import { canSelectQuotation, QuotationList } from "./quotation.list";
import { getToken } from "../../shared/api/tenant-context";

const statusFilters = [
  { id: "all", label: "All quotations" },
  { id: "draft", label: "Draft" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" }
];

const quotationColumnCatalog = [
  { id: "customer", label: "Customer" },
  { id: "items", label: "QTY" },
  { id: "taxable", label: "Taxable" },
  { id: "gst", label: "GST" },
  { id: "total", label: "Total" },
  { id: "status", label: "Status" },
  { id: "invoice", label: "Invoice" },
  { id: "action", label: "Action" }
] as const;

function isAdminSession() {
  const token = getToken("tenant");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { userType?: string };
    return payload.userType === "staff" || payload.userType === "super_admin";
  } catch {
    return false;
  }
}

function printQuotationFromList(quotationId: string) {
  const frame = document.createElement("iframe");
  let cleanupTimer: number | undefined;
  const cleanup = () => {
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
    frame.remove();
  };

  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.border = "0";
  frame.addEventListener(
    "load",
    () => frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true }),
    { once: true }
  );
  const printPath = window.location.pathname.startsWith("/app/")
    ? "/app/billing/quotation/print"
    : "/billing/quotation/print";
  frame.src = `${printPath}?id=${encodeURIComponent(quotationId)}&autoprint=1`;
  document.body.append(frame);
  cleanupTimer = window.setTimeout(cleanup, 120_000);
}

export function QuotationWorkspace() {
  const queryClient = useQueryClient();
  const settingsQuery = useSalesSettings();
  const settings = settingsQuery.data ?? defaultBillingSettings;
  const quotationLayout = settings.layout;
  const canAdminRevoke = isAdminSession();
  const [view, setView] = useState<QuotationView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<Set<string>>(() => new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(quotationColumnCatalog.map((column) => [column.id, true]))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const quotationsQuery = useQuotationPage({
    customer: contactFilter,
    page: currentPage,
    pageSize: rowsPerPage,
    search: searchValue,
    status: statusFilter
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: QuotationSavePayload }) =>
      id ? updateQuotation(id, payload) : createQuotation(payload),
    onSuccess: async (quotation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "settings"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "document-settings"] })
      ]);
      toast.success(
        view.mode === "upsert" && view.quotation ? "Quotation updated" : "Quotation created",
        {
          description: `${quotation.quotationNumber} is ready.`
        }
      );
      setView({ mode: "show", quotation });
    },
    onError: (error) => {
      toast.error("Quotation save failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "cancelled" | "confirmed" }) =>
      setQuotationStatus(id, status),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      toast.success("Quotation status updated", {
        description: `${quotation.quotationNumber} is now ${quotation.status}.`
      });
      setView((current) => (current.mode === "show" ? { mode: "show", quotation } : current));
    },
    onError: (error) => {
      toast.error("Status update failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeQuotation(id),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      toast.success("Quotation revoked", {
        description: `${quotation.quotationNumber} is editable again.`
      });
    },
    onError: (error) => {
      toast.error("Quotation revoke failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuotation(id),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      toast.success("Quotation deleted", { description: quotation.quotationNumber });
    },
    onError: (error) => {
      toast.error("Quotation could not be deleted", {
        description:
          error instanceof Error ? error.message : "Only draft quotations can be deleted."
      });
    }
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convertQuotationToSale(id),
    onSuccess: async ({ quotation, sale }) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      toast.success("Quotation converted", {
        description: `${quotation.quotationNumber} created sales invoice ${sale.invoiceNumber}.`
      });
      setView({ mode: "show", quotation });
    },
    onError: (error) => {
      toast.error("Quotation conversion failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const batchConvertMutation = useMutation({
    mutationFn: (ids: string[]) => convertQuotationsToSale(ids),
    onSuccess: async ({ sale }) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "quotations"] });
      setSelectedQuotationIds(new Set());
      toast.success("Draft sales invoice generated", { description: sale.invoiceNumber });
    },
    onError: (error) => {
      toast.error("Invoice generation failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const entries = quotationsQuery.data?.items ?? [];
  const contactOptions = useMemo(() => buildQuotationContactFilterOptions(entries), [entries]);
  const totalCount = quotationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pageEntries = entries;
  const pageTotals = useMemo(
    () =>
      pageEntries.reduce(
        (totals, quotation) => ({
          amount: totals.amount + quotation.amount,
          quantity: totals.quantity + totalQuotationQuantity(quotation),
          subtotal: totals.subtotal + quotation.subtotal,
          taxAmount: totals.taxAmount + quotation.taxAmount
        }),
        { amount: 0, quantity: 0, subtotal: 0, taxAmount: 0 }
      ),
    [pageEntries]
  );
  const selectedEntries = useMemo(
    () => entries.filter((quotation) => selectedQuotationIds.has(quotation.id)),
    [entries, selectedQuotationIds]
  );
  const pageSelectableEntries = pageEntries.filter(canSelectQuotation);
  const pageSelected =
    pageSelectableEntries.length > 0 &&
    pageSelectableEntries.every((quotation) => selectedQuotationIds.has(quotation.id));

  useEffect(() => {
    setSelectedQuotationIds((current) => {
      const available = new Set(entries.map((quotation) => quotation.id));
      const next = new Set(Array.from(current).filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [entries]);

  function toggleQuotationSelection(quotation: Quotation, checked: boolean) {
    if (!canSelectQuotation(quotation)) return;
    setSelectedQuotationIds((current) => {
      const next = new Set(current);
      if (checked) next.add(quotation.id);
      else next.delete(quotation.id);
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedQuotationIds((current) => {
      const next = new Set(current);
      for (const quotation of pageSelectableEntries) {
        if (checked) next.add(quotation.id);
        else next.delete(quotation.id);
      }
      return next;
    });
  }

  function generateInvoice() {
    if (!selectedEntries.length) {
      toast.error("Select at least one quotation.");
      return;
    }
    const contact = quotationContactKey(selectedEntries[0]!);
    if (selectedEntries.some((quotation) => quotationContactKey(quotation) !== contact)) {
      toast.error("Selected quotations must belong to the same contact.");
      return;
    }
    batchConvertMutation.mutate(selectedEntries.map((quotation) => quotation.id));
  }

  if (view.mode === "show") {
    const freshQuotation =
      entries.find((entry) => entry.id === view.quotation.id) ?? view.quotation;
    const currentIndex = entries.findIndex((entry) => entry.id === freshQuotation.id);
    const previousQuotation = currentIndex > 0 ? entries[currentIndex - 1] : null;
    const nextQuotation =
      currentIndex >= 0 && currentIndex < entries.length - 1 ? entries[currentIndex + 1] : null;
    return (
      <QuotationShowPage
        quotation={freshQuotation}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "upsert", quotation: freshQuotation, returnTo: "show" })}
        onNew={() => setView({ mode: "upsert", quotation: null, returnTo: "list" })}
        onPrint={() => window.print()}
        onConvert={() => convertMutation.mutate(freshQuotation.id)}
        onSuspend={() => statusMutation.mutate({ id: freshQuotation.id, status: "cancelled" })}
        converting={convertMutation.isPending}
        canEdit={freshQuotation.status === "draft"}
        {...(previousQuotation
          ? { onPrevious: () => setView({ mode: "show", quotation: previousQuotation }) }
          : {})}
        {...(nextQuotation
          ? { onNext: () => setView({ mode: "show", quotation: nextQuotation }) }
          : {})}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <QuotationForm
        errorMessage={saveMutation.error instanceof Error ? saveMutation.error.message : ""}
        loading={saveMutation.isPending}
        quotation={view.quotation}
        settings={quotationLayout}
        numbering={settings.numbering.quotation}
        canAdminRevoke={canAdminRevoke}
        {...(view.quotation && canAdminRevoke
          ? { onRevoke: () => revokeMutation.mutate(view.quotation!.id) }
          : {})}
        onBack={() =>
          setView(
            view.returnTo === "show" && view.quotation
              ? { mode: "show", quotation: view.quotation }
              : { mode: "list" }
          )
        }
        onSubmit={(payload, printAfter) => {
          saveMutation.mutate(view.quotation ? { id: view.quotation.id, payload } : { payload }, {
            onSuccess: () => {
              if (printAfter) window.setTimeout(() => window.print(), 250);
            }
          });
        }}
      />
    );
  }

  return (
    <WorkspacePage
      title="Quotations"
      description="Create and review tenant-isolated quotation vouchers with sales layout controls."
      technicalName="page.billing.quotation.list"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={quotationsQuery.isFetching}
            onClick={() => void quotationsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", quotationsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={!selectedEntries.length || batchConvertMutation.isPending}
            onClick={generateInvoice}
            type="button"
            variant="secondary"
          >
            <Send className="size-4" />
            Generate invoice{selectedEntries.length ? ` (${selectedEntries.length})` : ""}
          </Button>
          <Button
            className="h-9 rounded-md"
            onClick={() => setView({ mode: "upsert", quotation: null, returnTo: "list" })}
            type="button"
          >
            <Plus className="size-4" />
            New quotation
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
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
        searchPlaceholder="Search quotation, customer, work order, date, or total"
        searchValue={searchValue}
        columnOptions={quotationColumnCatalog.map((column) => ({
          ...column,
          checked: Boolean(visibleColumns[column.id]),
          onCheckedChange: (checked: boolean) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        onShowAllColumns={() =>
          setVisibleColumns(
            Object.fromEntries(quotationColumnCatalog.map((column) => [column.id, true]))
          )
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-4 py-3 text-sm shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="ml-1 min-w-64">
            <WorkspaceLookup
              options={[
                { label: "All contacts", value: "all" },
                ...contactOptions.map((option) => ({ label: option.label, value: option.id }))
              ]}
              placeholder="Search contact"
              value={contactFilter}
              onTextChange={(value) => {
                if (!value) {
                  setContactFilter("all");
                  setSelectedQuotationIds(new Set());
                  setCurrentPage(1);
                }
              }}
              onValueChange={(value) => {
                setContactFilter(value || "all");
                setSelectedQuotationIds(new Set());
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{selectedEntries.length} selected</span>
          <Button
            className="h-8 rounded-md px-2"
            disabled={!selectedEntries.length}
            onClick={() => setSelectedQuotationIds(new Set())}
            type="button"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      </div>
      {quotationsQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {quotationsQuery.error instanceof Error
              ? quotationsQuery.error.message
              : "Quotations could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
      <QuotationList
        entries={pageEntries}
        loading={quotationsQuery.isLoading}
        onEdit={(quotation) => setView({ mode: "upsert", quotation, returnTo: "list" })}
        onSetStatus={(quotation, status) => statusMutation.mutate({ id: quotation.id, status })}
        onForceDelete={(quotation) => {
          if (window.confirm(`Force delete ${quotation.quotationNumber}? This cannot be undone.`))
            deleteMutation.mutate(quotation.id);
        }}
        onRevoke={(quotation) => revokeMutation.mutate(quotation.id)}
        onPrint={(quotation) => printQuotationFromList(quotation.id)}
        canAdminRevoke={canAdminRevoke}
        onView={(quotation) => setView({ mode: "show", quotation })}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        pageSelected={pageSelected}
        pageSelectableCount={pageSelectableEntries.length}
        selectedQuotationIds={selectedQuotationIds}
        onTogglePageSelection={togglePageSelection}
        onToggleSelection={toggleQuotationSelection}
        visibleColumns={visibleColumns}
      />
      <QuotationPageTotals
        amount={pageTotals.amount}
        quantity={pageTotals.quantity}
        subtotal={pageTotals.subtotal}
        taxAmount={pageTotals.taxAmount}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, totalCount)}
        singularLabel="quotations"
        totalCount={totalCount}
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

function QuotationPageTotals({
  amount,
  quantity,
  subtotal,
  taxAmount
}: {
  amount: number;
  quantity: number;
  subtotal: number;
  taxAmount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border/70 bg-card px-4 py-2.5 shadow-sm md:grid-cols-4">
      <PageTotal label="Total quantity" value={String(quantity)} />
      <PageTotal label="Total taxable" value={formatMoney(subtotal)} />
      <PageTotal label="Total GST" value={formatMoney(taxAmount)} />
      <PageTotal label="Grand total" strong value={formatMoney(amount)} />
    </div>
  );
}

function PageTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex h-full items-center justify-start gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function quotationContactKey(quotation: Quotation) {
  return quotation.customerName.trim().toLowerCase();
}

function buildQuotationContactFilterOptions(entries: Quotation[]) {
  const byKey = new Map<string, string>();
  for (const quotation of entries) {
    const key = quotationContactKey(quotation);
    if (!byKey.has(key)) byKey.set(key, quotation.customerName || key);
  }
  return Array.from(byKey, ([id, label]) => ({ id, label })).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}
