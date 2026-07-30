import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceTableEmptyState, WorkspaceTablePanel } from "@codexsun/ui/workspace/table";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { useBillingSettings } from "../settings";
import { defaultBillingSettings } from "../settings/settings.types";
import { type Purchase, type PurchaseSavePayload, type PurchaseView } from "./purchase.types";
import { PurchaseShowPage } from "./purchase.show";
import {
  createPurchase,
  convertPurchaseToSale,
  convertPurchasesToSale,
  deletePurchase,
  formatMoney,
  getPurchase,
  setPurchaseStatus,
  revokePurchase,
  totalPurchaseQuantity,
  updatePurchase
} from "./purchase.services";
import { usePurchasePage } from "./purchase.hooks";
import { PurchaseForm } from "./purchase.form";
import { canSelectPurchase, PurchaseList } from "./purchase.list";
import { getToken } from "../../shared/api/tenant-context";

const statusFilters = [
  { id: "all", label: "All purchase" },
  { id: "draft", label: "Draft" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" }
];

const purchaseColumnCatalog = [
  { id: "issuedOn", label: "Date" },
  { id: "supplier", label: "Supplier" },
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

function printPurchaseFromList(purchaseId: string) {
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
    ? "/app/billing/purchase/print"
    : "/billing/purchase/print";
  frame.src = `${printPath}?id=${encodeURIComponent(purchaseId)}&autoprint=1`;
  document.body.append(frame);
  cleanupTimer = window.setTimeout(cleanup, 120_000);
}

export function PurchaseWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  const queryClient = useQueryClient();
  const settingsQuery = useBillingSettings();
  const settings = settingsQuery.data ?? defaultBillingSettings;
  const purchaseLayout = settings.layout;
  const canAdminRevoke = isAdminSession();
  const [view, setView] = useState<PurchaseView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(() => new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(purchaseColumnCatalog.map((column) => [column.id, true]))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const purchasesQuery = usePurchasePage({
    customer: contactFilter,
    page: currentPage,
    pageSize: rowsPerPage,
    search: searchValue,
    status: statusFilter
  });

  useEffect(() => {
    if (!initialRecordId) return;
    let active = true;
    void getPurchase(initialRecordId)
      .then((purchase) => {
        if (active) setView({ mode: "show", purchase });
      })
      .catch((error) => {
        if (active)
          toast.error("Purchase could not be opened", {
            description: error instanceof Error ? error.message : "Please try again."
          });
      });
    return () => {
      active = false;
    };
  }, [initialRecordId]);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: PurchaseSavePayload }) =>
      id ? updatePurchase(id, payload) : createPurchase(payload),
    onSuccess: async (purchase) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "settings"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "document-settings"] })
      ]);
      toast.success(
        view.mode === "upsert" && view.purchase ? "Purchase updated" : "Purchase created",
        {
          description: `${purchase.invoiceNumber} is ready.`
        }
      );
      setView({ mode: "show", purchase });
    },
    onError: (error) => {
      toast.error("Purchase save failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "cancelled" | "confirmed" }) =>
      setPurchaseStatus(id, status),
    onSuccess: async (purchase) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
      toast.success("Purchase status updated", {
        description: `${purchase.invoiceNumber} is now ${purchase.status}.`
      });
      setView((current) => (current.mode === "show" ? { mode: "show", purchase } : current));
    },
    onError: (error) => {
      toast.error("Status update failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokePurchase(id),
    onSuccess: async (purchase) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
      toast.success("Purchase revoked", {
        description: `${purchase.invoiceNumber} is editable again.`
      });
    },
    onError: (error) => {
      toast.error("Purchase revoke failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePurchase(id),
    onSuccess: async (purchase) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
      toast.success("Purchase deleted", { description: purchase.invoiceNumber });
    },
    onError: (error) => {
      toast.error("Purchase could not be deleted", {
        description: error instanceof Error ? error.message : "Only draft purchases can be deleted."
      });
    }
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convertPurchaseToSale(id),
    onSuccess: async ({ purchase, sale }) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
      toast.success("Purchase converted", {
        description: `${purchase.invoiceNumber} created sales invoice ${sale.invoiceNumber}.`
      });
    },
    onError: (error) => {
      toast.error("Purchase conversion failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const batchConvertMutation = useMutation({
    mutationFn: (ids: string[]) => convertPurchasesToSale(ids),
    onSuccess: async ({ sale }) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
      setSelectedPurchaseIds(new Set());
      toast.success("Draft sales invoice generated", { description: sale.invoiceNumber });
    },
    onError: (error) => {
      toast.error("Invoice generation failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const entries = purchasesQuery.data?.items ?? [];
  const contactOptions = useMemo(() => buildPurchaseContactFilterOptions(entries), [entries]);
  const totalCount = purchasesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pageEntries = entries;
  const pageTotals = useMemo(
    () =>
      pageEntries.reduce(
        (totals, purchase) => ({
          amount: totals.amount + purchase.amount,
          quantity: totals.quantity + totalPurchaseQuantity(purchase),
          subtotal: totals.subtotal + purchase.subtotal,
          taxAmount: totals.taxAmount + purchase.taxAmount
        }),
        { amount: 0, quantity: 0, subtotal: 0, taxAmount: 0 }
      ),
    [pageEntries]
  );
  const selectedEntries = useMemo(
    () => entries.filter((purchase) => selectedPurchaseIds.has(purchase.id)),
    [entries, selectedPurchaseIds]
  );
  const pageSelectableEntries = pageEntries.filter(canSelectPurchase);
  const pageSelected =
    pageSelectableEntries.length > 0 &&
    pageSelectableEntries.every((purchase) => selectedPurchaseIds.has(purchase.id));

  useEffect(() => {
    setSelectedPurchaseIds((current) => {
      const available = new Set(entries.map((purchase) => purchase.id));
      const next = new Set(Array.from(current).filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [entries]);

  function togglePurchaseSelection(purchase: Purchase, checked: boolean) {
    if (!canSelectPurchase(purchase)) return;
    setSelectedPurchaseIds((current) => {
      const next = new Set(current);
      if (checked) next.add(purchase.id);
      else next.delete(purchase.id);
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedPurchaseIds((current) => {
      const next = new Set(current);
      for (const purchase of pageSelectableEntries) {
        if (checked) next.add(purchase.id);
        else next.delete(purchase.id);
      }
      return next;
    });
  }

  function generateInvoice() {
    if (!selectedEntries.length) {
      toast.error("Select at least one purchase.");
      return;
    }
    const contact = purchaseContactKey(selectedEntries[0]!);
    if (selectedEntries.some((purchase) => purchaseContactKey(purchase) !== contact)) {
      toast.error("Selected purchases must belong to the same supplier.");
      return;
    }
    if (selectedEntries.length === 1) {
      convertMutation.mutate(selectedEntries[0]!.id);
      return;
    }
    batchConvertMutation.mutate(selectedEntries.map((purchase) => purchase.id));
  }

  if (view.mode === "show") {
    const freshPurchase = entries.find((entry) => entry.id === view.purchase.id) ?? view.purchase;
    const currentIndex = entries.findIndex((entry) => entry.id === freshPurchase.id);
    const previousPurchase = currentIndex > 0 ? entries[currentIndex - 1] : null;
    const nextPurchase =
      currentIndex >= 0 && currentIndex < entries.length - 1 ? entries[currentIndex + 1] : null;
    return (
      <PurchaseShowPage
        purchase={freshPurchase}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "upsert", purchase: freshPurchase, returnTo: "show" })}
        onNew={() => setView({ mode: "upsert", purchase: null, returnTo: "list" })}
        onPrint={() => window.print()}
        onSuspend={() => statusMutation.mutate({ id: freshPurchase.id, status: "cancelled" })}
        canEdit={freshPurchase.status === "draft"}
        {...(previousPurchase
          ? { onPrevious: () => setView({ mode: "show", purchase: previousPurchase }) }
          : {})}
        {...(nextPurchase
          ? { onNext: () => setView({ mode: "show", purchase: nextPurchase }) }
          : {})}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <PurchaseForm
        errorMessage={saveMutation.error instanceof Error ? saveMutation.error.message : ""}
        loading={saveMutation.isPending}
        purchase={view.purchase}
        settings={purchaseLayout}
        numbering={settings.numbering.purchase}
        canAdminRevoke={canAdminRevoke}
        {...(view.purchase && canAdminRevoke
          ? { onRevoke: () => revokeMutation.mutate(view.purchase!.id) }
          : {})}
        onBack={() =>
          setView(
            view.returnTo === "show" && view.purchase
              ? { mode: "show", purchase: view.purchase }
              : { mode: "list" }
          )
        }
        onSubmit={(payload, printAfter) => {
          saveMutation.mutate(view.purchase ? { id: view.purchase.id, payload } : { payload }, {
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
      title="Purchases"
      description="Create and review tenant-isolated purchase vouchers with sales layout controls."
      technicalName="page.billing.purchase.list"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={
              !selectedEntries.length || convertMutation.isPending || batchConvertMutation.isPending
            }
            onClick={generateInvoice}
            type="button"
            variant="secondary"
          >
            <Send className="size-4" />
            Generate invoice{selectedEntries.length ? ` (${selectedEntries.length})` : ""}
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={purchasesQuery.isFetching}
            onClick={() => void purchasesQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", purchasesQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            onClick={() => setView({ mode: "upsert", purchase: null, returnTo: "list" })}
            type="button"
          >
            <Plus className="size-4" />
            New purchase
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
        searchPlaceholder="Search purchase, supplier, work order, date, or total"
        searchValue={searchValue}
        columnOptions={purchaseColumnCatalog.map((column) => ({
          ...column,
          checked: Boolean(visibleColumns[column.id]),
          onCheckedChange: (checked: boolean) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        onShowAllColumns={() =>
          setVisibleColumns(
            Object.fromEntries(purchaseColumnCatalog.map((column) => [column.id, true]))
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
                  setSelectedPurchaseIds(new Set());
                  setCurrentPage(1);
                }
              }}
              onValueChange={(value) => {
                setContactFilter(value || "all");
                setSelectedPurchaseIds(new Set());
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
            onClick={() => setSelectedPurchaseIds(new Set())}
            type="button"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      </div>
      {purchasesQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {purchasesQuery.error instanceof Error
              ? purchasesQuery.error.message
              : "Purchases could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
      <PurchaseList
        entries={pageEntries}
        loading={purchasesQuery.isLoading}
        onEdit={(purchase) => setView({ mode: "upsert", purchase, returnTo: "list" })}
        onSetStatus={(purchase, status) => statusMutation.mutate({ id: purchase.id, status })}
        onForceDelete={(purchase) => {
          if (window.confirm(`Force delete ${purchase.invoiceNumber}? This cannot be undone.`))
            deleteMutation.mutate(purchase.id);
        }}
        onRevoke={(purchase) => revokeMutation.mutate(purchase.id)}
        onPrint={(purchase) => printPurchaseFromList(purchase.id)}
        canAdminRevoke={canAdminRevoke}
        onView={(purchase) => setView({ mode: "show", purchase })}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        pageSelected={pageSelected}
        pageSelectableCount={pageSelectableEntries.length}
        selectedPurchaseIds={selectedPurchaseIds}
        onTogglePageSelection={togglePageSelection}
        onToggleSelection={togglePurchaseSelection}
        visibleColumns={visibleColumns}
      />
      <PurchasePageTotals
        amount={pageTotals.amount}
        quantity={pageTotals.quantity}
        subtotal={pageTotals.subtotal}
        taxAmount={pageTotals.taxAmount}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, totalCount)}
        singularLabel="purchases"
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

function PurchasePageTotals({
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

function purchaseContactKey(purchase: Purchase) {
  return purchase.supplierName.trim().toLowerCase();
}

function buildPurchaseContactFilterOptions(entries: Purchase[]) {
  const byKey = new Map<string, string>();
  for (const purchase of entries) {
    const key = purchaseContactKey(purchase);
    if (!byKey.has(key)) byKey.set(key, purchase.supplierName || key);
  }
  return Array.from(byKey, ([id, label]) => ({ id, label })).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}
