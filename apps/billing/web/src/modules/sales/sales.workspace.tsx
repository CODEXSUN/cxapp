import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceTableEmptyState, WorkspaceTablePanel } from "@codexsun/ui/workspace/table";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { cn } from "@codexsun/ui/lib/utils";
import { useSalesSettings } from "../settings";
import { defaultBillingSettings } from "../settings/settings.types";
import { type Sale, type SaleSavePayload, type SaleView } from "./sales.types";
import { SaleShowPage } from "./sales.show";
import {
  createSale,
  deleteSale,
  formatMoney,
  getSale,
  setSaleStatus,
  revokeSale,
  totalSaleQuantity,
  updateSale
} from "./sales.services";
import { useSalesPage } from "./sales.hooks";
import { SalesForm } from "./sales.form";
import { canSelectSale, SalesList } from "./sales.list";
import { getToken } from "../../shared/api/tenant-context";

const statusFilters = [
  { id: "all", label: "All sales" },
  { id: "draft", label: "Draft" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" }
];

const saleColumnCatalog = [
  { id: "date", label: "Date" },
  { id: "customer", label: "Customer" },
  { id: "items", label: "QTY" },
  { id: "taxable", label: "Taxable" },
  { id: "gst", label: "GST" },
  { id: "total", label: "Total" },
  { id: "status", label: "Status" },
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

export function SalesWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  const queryClient = useQueryClient();
  const settingsQuery = useSalesSettings();
  const settings = settingsQuery.data ?? defaultBillingSettings;
  const saleLayout = settings.layout;
  const canAdminRevoke = isAdminSession();
  const [view, setView] = useState<SaleView>({ mode: "list" });
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingListPrintId, setPendingListPrintId] = useState<string | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(() => new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saleColumnCatalog.map((column) => [column.id, true]))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const salesQuery = useSalesPage({
    page: currentPage,
    pageSize: rowsPerPage,
    search: searchValue,
    status: statusFilter
  });

  useEffect(() => {
    if (view.mode !== "show" || pendingListPrintId !== view.sale.id) return;

    let printFrame = 0;
    let settleFrame = 0;
    const restoreList = () => {
      setPendingListPrintId(null);
      setView({ mode: "list" });
    };

    window.addEventListener("afterprint", restoreList, { once: true });
    printFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(() => window.print());
    });

    return () => {
      window.cancelAnimationFrame(printFrame);
      window.cancelAnimationFrame(settleFrame);
      window.removeEventListener("afterprint", restoreList);
    };
  }, [pendingListPrintId, view]);

  useEffect(() => {
    if (!initialRecordId) return;
    let active = true;
    void getSale(initialRecordId)
      .then((sale) => {
        if (active) setView({ mode: "show", sale });
      })
      .catch((error) => {
        if (active)
          toast.error("Sale could not be opened", {
            description: error instanceof Error ? error.message : "Please try again."
          });
      });
    return () => {
      active = false;
    };
  }, [initialRecordId]);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: SaleSavePayload }) =>
      id ? updateSale(id, payload) : createSale(payload),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "sales"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "settings"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "document-settings"] })
      ]);
      toast.success(view.mode === "upsert" && view.sale ? "Sale updated" : "Sale created", {
        description: `${sale.saleNumber} is ready.`
      });
      if (sale.numberingWarning) {
        toast.warning("Sale number changed", { description: sale.numberingWarning });
      }
      setView({ mode: "show", sale });
    },
    onError: (error) => {
      toast.error("Sale save failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "cancelled" | "confirmed" }) =>
      setSaleStatus(id, status),
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "sales"] });
      toast.success("Sale status updated", {
        description: `${sale.saleNumber} is now ${sale.status}.`
      });
      setView((current) => (current.mode === "show" ? { mode: "show", sale } : current));
    },
    onError: (error) => {
      toast.error("Status update failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSale(id),
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "sales"] });
      toast.success("Sale revoked", { description: `${sale.saleNumber} is editable again.` });
    },
    onError: (error) => {
      toast.error("Sale revoke failed", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSale(id),
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "sales"] });
      toast.success("Sale deleted", { description: sale.saleNumber });
    },
    onError: (error) => {
      toast.error("Sale could not be deleted", {
        description: error instanceof Error ? error.message : "Only draft sales can be deleted."
      });
    }
  });

  const entries = salesQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((salesQuery.data?.total ?? 0) / rowsPerPage));
  const pageEntries = entries;
  const pageTotals = useMemo(
    () =>
      pageEntries.reduce(
        (totals, sale) => ({
          amount: totals.amount + sale.amount,
          quantity: totals.quantity + totalSaleQuantity(sale),
          subtotal: totals.subtotal + sale.subtotal,
          taxAmount: totals.taxAmount + sale.taxAmount
        }),
        { amount: 0, quantity: 0, subtotal: 0, taxAmount: 0 }
      ),
    [pageEntries]
  );
  const pageSelectableEntries = pageEntries.filter(canSelectSale);
  const pageSelected =
    pageSelectableEntries.length > 0 &&
    pageSelectableEntries.every((sale) => selectedSaleIds.has(sale.id));

  useEffect(() => {
    setSelectedSaleIds((current) => {
      const available = new Set(entries.map((sale) => sale.id));
      const next = new Set(Array.from(current).filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [entries]);

  async function openNewSale() {
    await settingsQuery.refetch();
    setView({ mode: "upsert", sale: null, returnTo: "list" });
  }

  function toggleSaleSelection(sale: Sale, checked: boolean) {
    if (!canSelectSale(sale)) return;
    setSelectedSaleIds((current) => {
      const next = new Set(current);
      if (checked) next.add(sale.id);
      else next.delete(sale.id);
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedSaleIds((current) => {
      const next = new Set(current);
      for (const sale of pageSelectableEntries) {
        if (checked) next.add(sale.id);
        else next.delete(sale.id);
      }
      return next;
    });
  }

  if (view.mode === "show") {
    const freshSale = entries.find((entry) => entry.id === view.sale.id) ?? view.sale;
    const currentIndex = entries.findIndex((entry) => entry.id === freshSale.id);
    const previousSale = currentIndex > 0 ? entries[currentIndex - 1] : null;
    const nextSale =
      currentIndex >= 0 && currentIndex < entries.length - 1 ? entries[currentIndex + 1] : null;
    return (
      <SaleShowPage
        sale={freshSale}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "upsert", sale: freshSale, returnTo: "show" })}
        onNew={() => void openNewSale()}
        onPrint={() => window.print()}
        onSuspend={() => statusMutation.mutate({ id: freshSale.id, status: "cancelled" })}
        canEdit={freshSale.status === "draft"}
        {...(previousSale
          ? { onPrevious: () => setView({ mode: "show", sale: previousSale }) }
          : {})}
        {...(nextSale ? { onNext: () => setView({ mode: "show", sale: nextSale }) } : {})}
      />
    );
  }

  if (view.mode === "upsert") {
    return (
      <SalesForm
        errorMessage={saveMutation.error instanceof Error ? saveMutation.error.message : ""}
        loading={saveMutation.isPending}
        sale={view.sale}
        settings={saleLayout}
        numbering={settings.numbering.sales}
        canAdminRevoke={canAdminRevoke}
        {...(view.sale && canAdminRevoke
          ? { onRevoke: () => revokeMutation.mutate(view.sale!.id) }
          : {})}
        onBack={() =>
          setView(
            view.returnTo === "show" && view.sale
              ? { mode: "show", sale: view.sale }
              : { mode: "list" }
          )
        }
        onSubmit={(payload, printAfter) => {
          saveMutation.mutate(view.sale ? { id: view.sale.id, payload } : { payload }, {
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
      title="Sales"
      description="Create and review tenant-isolated sale vouchers with sales layout controls."
      technicalName="page.billing.sale.list"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={salesQuery.isFetching}
            onClick={() => void salesQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", salesQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => void openNewSale()} type="button">
            <Plus className="size-4" />
            New sale
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
        searchPlaceholder="Search sale, customer, work order, date, or total"
        searchValue={searchValue}
        columnOptions={saleColumnCatalog.map((column) => ({
          ...column,
          checked: Boolean(visibleColumns[column.id]),
          onCheckedChange: (checked: boolean) =>
            setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
        }))}
        onShowAllColumns={() =>
          setVisibleColumns(
            Object.fromEntries(saleColumnCatalog.map((column) => [column.id, true]))
          )
        }
      />
      {salesQuery.isError ? (
        <WorkspaceTablePanel>
          <WorkspaceTableEmptyState>
            {salesQuery.error instanceof Error
              ? salesQuery.error.message
              : "Sales could not be loaded."}
          </WorkspaceTableEmptyState>
        </WorkspaceTablePanel>
      ) : null}
      <SalesList
        entries={pageEntries}
        loading={salesQuery.isLoading}
        onEdit={(sale) => setView({ mode: "upsert", sale, returnTo: "list" })}
        onSetStatus={(sale, status) => statusMutation.mutate({ id: sale.id, status })}
        onForceDelete={(sale) => {
          if (window.confirm(`Force delete ${sale.saleNumber}? This cannot be undone.`))
            deleteMutation.mutate(sale.id);
        }}
        onRevoke={(sale) => revokeMutation.mutate(sale.id)}
        onPrint={(sale) => {
          setPendingListPrintId(sale.id);
          setView({ mode: "show", sale });
        }}
        canAdminRevoke={canAdminRevoke}
        onView={(sale) => setView({ mode: "show", sale })}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        pageSelected={pageSelected}
        pageSelectableCount={pageSelectableEntries.length}
        selectedSaleIds={selectedSaleIds}
        onTogglePageSelection={togglePageSelection}
        onToggleSelection={toggleSaleSelection}
        visibleColumns={visibleColumns}
      />
      <SalePageTotals
        amount={pageTotals.amount}
        quantity={pageTotals.quantity}
        subtotal={pageTotals.subtotal}
        taxAmount={pageTotals.taxAmount}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, salesQuery.data?.total ?? 0)}
        singularLabel="sales"
        totalCount={salesQuery.data?.total ?? 0}
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

function SalePageTotals({
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
