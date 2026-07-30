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
import { formatDate, formatMoney, totalExportSaleQuantity } from "./export-sales.services";
import type { ExportSale } from "./export-sales.types";

export function ExportSalesList({
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
  selectedExportSaleIds,
  onTogglePageSelection,
  onToggleSelection,
  visibleColumns
}: {
  canAdminRevoke: boolean;
  entries: ExportSale[];
  loading: boolean;
  onEdit: (exportSale: ExportSale) => void;
  onForceDelete: (exportSale: ExportSale) => void;
  onPrint: (exportSale: ExportSale) => void;
  onRevoke: (exportSale: ExportSale) => void;
  onSetStatus: (exportSale: ExportSale, status: "cancelled" | "confirmed") => void;
  onView: (exportSale: ExportSale) => void;
  page: number;
  pageSelected: boolean;
  pageSelectableCount: number;
  rowsPerPage: number;
  selectedExportSaleIds: Set<string>;
  onTogglePageSelection: (checked: boolean) => void;
  onToggleSelection: (exportSale: ExportSale, checked: boolean) => void;
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
                  aria-label="Select export sales on this page"
                  checked={pageSelected}
                  className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pageSelectableCount === 0}
                  onChange={(event) => onTogglePageSelection(event.target.checked)}
                  type="checkbox"
                />
              </th>
              {[
                "Export Sale",
                ...(visibleColumns.date ? ["Date"] : []),
                ...(visibleColumns.customer ? ["Customer"] : []),
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
            {entries.map((exportSale) => (
              <tr
                key={exportSale.id}
                className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 text-center">
                  <input
                    aria-label={`Select ${exportSale.invoiceNumber}`}
                    checked={selectedExportSaleIds.has(exportSale.id)}
                    className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canSelectExportSale(exportSale)}
                    onChange={(event) => onToggleSelection(exportSale, event.target.checked)}
                    type="checkbox"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                    onClick={() => onView(exportSale)}
                    title="View export sale"
                    type="button"
                  >
                    {exportSale.invoiceNumber}
                  </button>
                </td>
                {visibleColumns.date ? (
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {formatDate(exportSale.issuedOn)}
                  </td>
                ) : null}
                {visibleColumns.customer ? (
                  <td className="px-4 py-2.5">
                    <button
                      className={cn(
                        "font-medium underline-offset-4",
                        exportSale.status === "draft"
                          ? "hover:underline"
                          : "cursor-not-allowed text-muted-foreground"
                      )}
                      disabled={exportSale.status !== "draft"}
                      onClick={() => onEdit(exportSale)}
                      title={
                        exportSale.status === "draft"
                          ? "Edit export sale"
                          : "Submitted export sales cannot be edited"
                      }
                      type="button"
                    >
                      {exportSale.customerName}
                    </button>
                  </td>
                ) : null}
                {visibleColumns.items ? (
                  <td className="px-4 py-2.5 text-right">{totalExportSaleQuantity(exportSale)}</td>
                ) : null}
                {visibleColumns.taxable ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(exportSale.subtotal)}</td>
                ) : null}
                {visibleColumns.gst ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(exportSale.taxAmount)}</td>
                ) : null}
                {visibleColumns.total ? (
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatMoney(exportSale.amount)}
                  </td>
                ) : null}
                {visibleColumns.status ? (
                  <td className="px-4 py-2.5">
                    <StatusPill exportSale={exportSale} />
                  </td>
                ) : null}
                {visibleColumns.invoice ? (
                  <td className="px-4 py-2.5 font-semibold text-sky-700">
                    {exportSale.invoiceNumber}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-center">
                  <Button
                    aria-label={`Print ${exportSale.invoiceNumber}`}
                    className="size-8"
                    onClick={() => onPrint(exportSale)}
                    size="icon"
                    title={`Print ${exportSale.invoiceNumber}`}
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
                        ...(exportSale.status === "draft"
                          ? [
                              {
                                id: "confirm",
                                label: "Confirm",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onSetStatus(exportSale, "confirmed")
                              }
                            ]
                          : []),
                        ...(canAdminRevoke && exportSale.status === "confirmed"
                          ? [
                              {
                                id: "revoke",
                                label: "Revoke by admin",
                                icon: <RotateCcw className="size-4" />,
                                onSelect: () => onRevoke(exportSale)
                              }
                            ]
                          : []),
                        ...(exportSale.status !== "cancelled"
                          ? [
                              {
                                id: "suspend",
                                label: "Suspend",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onSetStatus(exportSale, "cancelled")
                              }
                            ]
                          : []),
                        ...(exportSale.status === "draft"
                          ? [
                              {
                                id: "force-delete",
                                label: "Force delete",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onForceDelete(exportSale)
                              }
                            ]
                          : [])
                      ]}
                      {...(exportSale.status === "draft"
                        ? { onEdit: () => onEdit(exportSale) }
                        : {})}
                      onView={() => onView(exportSale)}
                      title={exportSale.invoiceNumber}
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
        <WorkspaceTableEmptyState>No export sales found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function StatusPill({
  exportSale,
  status
}: {
  exportSale?: ExportSale;
  status?: ExportSale["status"];
}) {
  const label = status ?? exportSale?.status ?? "draft";
  const tone = label === "confirmed" ? "success" : label === "cancelled" ? "danger" : "warning";
  return <WorkspaceStatusBadge label={label} tone={tone} />;
}

export function canSelectExportSale(exportSale: ExportSale) {
  return exportSale.status !== "cancelled";
}
