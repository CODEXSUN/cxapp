import { Eye, Printer, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import { cn } from "@codexsun/ui/lib/utils";
import { formatDate, formatMoney, totalPurchaseQuantity } from "./purchase.services";
import type { Purchase } from "./purchase.types";

export function PurchaseList({
  canAdminRevoke,
  entries,
  loading,
  onEdit,
  onForceDelete,
  onPrint,
  onRevoke,
  onSetStatus,
  onView,
  page: _page,
  pageSelected,
  pageSelectableCount,
  rowsPerPage: _rowsPerPage,
  selectedPurchaseIds,
  onTogglePageSelection,
  onToggleSelection,
  visibleColumns
}: {
  canAdminRevoke: boolean;
  entries: Purchase[];
  loading: boolean;
  onEdit: (purchase: Purchase) => void;
  onForceDelete: (purchase: Purchase) => void;
  onPrint: (purchase: Purchase) => void;
  onRevoke: (purchase: Purchase) => void;
  onSetStatus: (purchase: Purchase, status: "cancelled" | "confirmed") => void;
  onView: (purchase: Purchase) => void;
  page: number;
  pageSelected: boolean;
  pageSelectableCount: number;
  rowsPerPage: number;
  selectedPurchaseIds: Set<string>;
  onTogglePageSelection: (checked: boolean) => void;
  onToggleSelection: (purchase: Purchase, checked: boolean) => void;
  visibleColumns: Record<string, boolean>;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 border-b border-border/70 px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <input
                  aria-label="Select purchases on this page"
                  checked={pageSelected}
                  className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pageSelectableCount === 0}
                  onChange={(event) => onTogglePageSelection(event.target.checked)}
                  type="checkbox"
                />
              </th>
              {[
                "Purchase",
                ...(visibleColumns.issuedOn ? ["Date"] : []),
                ...(visibleColumns.supplier ? ["Supplier"] : []),
                ...(visibleColumns.items ? ["QTY"] : []),
                ...(visibleColumns.taxable ? ["Taxable"] : []),
                ...(visibleColumns.gst ? ["GST"] : []),
                ...(visibleColumns.total ? ["Total"] : []),
                ...(visibleColumns.status ? ["Status"] : []),
                ...(visibleColumns.invoice ? ["Invoice"] : []),
                "Print",
                ...(visibleColumns.action ? ["Action"] : [])
              ].map((heading) => (
                <th
                  key={heading}
                  className={cn(
                    "border-b border-border/70 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    ["QTY", "Taxable", "GST", "Total"].includes(heading)
                      ? "text-right"
                      : heading === "Print"
                        ? "text-center"
                        : "text-left"
                  )}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((purchase, _index) => (
              <tr
                key={purchase.id}
                className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 text-center">
                  <input
                    aria-label={`Select ${purchase.invoiceNumber}`}
                    checked={selectedPurchaseIds.has(purchase.id)}
                    className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canSelectPurchase(purchase)}
                    onChange={(event) => onToggleSelection(purchase, event.target.checked)}
                    title={
                      purchase.generatedSalesInvoiceNo
                        ? `Already invoiced by ${purchase.generatedSalesInvoiceNo}`
                        : undefined
                    }
                    type="checkbox"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                    onClick={() => onView(purchase)}
                    title="View purchase"
                    type="button"
                  >
                    {purchase.invoiceNumber}
                  </button>
                </td>
                {visibleColumns.issuedOn ? (
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(purchase.issuedOn)}</td>
                ) : null}
                {visibleColumns.supplier ? (
                  <td className="px-4 py-2.5">
                    <button
                      className={cn(
                        "font-medium underline-offset-4",
                        purchase.status === "draft"
                          ? "hover:underline"
                          : "cursor-not-allowed text-muted-foreground"
                      )}
                      disabled={purchase.status !== "draft"}
                      onClick={() => onEdit(purchase)}
                      title={
                        purchase.status === "draft"
                          ? "Edit purchase"
                          : "Submitted purchases cannot be edited"
                      }
                      type="button"
                    >
                      {purchase.supplierName}
                    </button>
                  </td>
                ) : null}
                {visibleColumns.items ? (
                  <td className="px-4 py-2.5 text-right">{totalPurchaseQuantity(purchase)}</td>
                ) : null}
                {visibleColumns.taxable ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(purchase.subtotal)}</td>
                ) : null}
                {visibleColumns.gst ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(purchase.taxAmount)}</td>
                ) : null}
                {visibleColumns.total ? (
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatMoney(purchase.amount)}
                  </td>
                ) : null}
                {visibleColumns.status ? (
                  <td className="px-4 py-2.5">
                    <StatusPill purchase={purchase} />
                  </td>
                ) : null}
                {visibleColumns.invoice ? (
                  <td className="px-4 py-2.5 font-semibold text-sky-700">
                    {purchase.generatedSalesInvoiceNo || "-"}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-center">
                  <Button
                    aria-label={`Print ${purchase.invoiceNumber}`}
                    className="size-8"
                    onClick={() => onPrint(purchase)}
                    size="icon"
                    title={`Print ${purchase.invoiceNumber}`}
                    type="button"
                    variant="outline"
                  >
                    <Printer className="size-4" />
                  </Button>
                </td>
                {visibleColumns.action ? (
                  <td className="px-4 py-2.5">
                    <WorkspaceRowActions
                      actions={[
                        ...(purchase.status === "draft"
                          ? [
                              {
                                id: "confirm",
                                label: "Confirm",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onSetStatus(purchase, "confirmed")
                              }
                            ]
                          : []),
                        ...(canAdminRevoke &&
                        purchase.status === "confirmed" &&
                        !purchase.generatedSalesInvoiceNo
                          ? [
                              {
                                id: "revoke",
                                label: "Revoke by admin",
                                icon: <RotateCcw className="size-4" />,
                                onSelect: () => onRevoke(purchase)
                              }
                            ]
                          : []),
                        ...(purchase.status !== "cancelled" && !purchase.generatedSalesInvoiceNo
                          ? [
                              {
                                id: "suspend",
                                label: "Suspend",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onSetStatus(purchase, "cancelled")
                              }
                            ]
                          : []),
                        ...(purchase.status === "draft"
                          ? [
                              {
                                id: "force-delete",
                                label: "Force delete",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onForceDelete(purchase)
                              }
                            ]
                          : [])
                      ]}
                      {...(purchase.status === "draft" ? { onEdit: () => onEdit(purchase) } : {})}
                      onView={() => onView(purchase)}
                      title={purchase.invoiceNumber}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && loading ? <WorkspaceTableLoadingState /> : null}
      {entries.length === 0 && !loading ? (
        <WorkspaceTableEmptyState>No purchases found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function StatusPill({ purchase, status }: { purchase?: Purchase; status?: Purchase["status"] }) {
  const label = purchase?.generatedSalesInvoiceNo
    ? "invoiced"
    : (status ?? purchase?.status ?? "draft");
  const tone =
    label === "invoiced"
      ? "info"
      : label === "confirmed"
        ? "success"
        : label === "cancelled"
          ? "danger"
          : "warning";
  return <WorkspaceStatusBadge label={label} tone={tone} />;
}

export function canSelectPurchase(purchase: Purchase) {
  return purchase.status !== "cancelled" && !purchase.generatedSalesInvoiceNo;
}
