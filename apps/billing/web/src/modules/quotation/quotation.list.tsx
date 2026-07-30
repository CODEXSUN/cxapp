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
import { formatDate, formatMoney, totalQuotationQuantity } from "./quotation.services";
import type { Quotation } from "./quotation.types";

export function QuotationList({
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
  selectedQuotationIds,
  onTogglePageSelection,
  onToggleSelection,
  visibleColumns
}: {
  canAdminRevoke: boolean;
  entries: Quotation[];
  loading: boolean;
  onEdit: (quotation: Quotation) => void;
  onForceDelete: (quotation: Quotation) => void;
  onPrint: (quotation: Quotation) => void;
  onRevoke: (quotation: Quotation) => void;
  onSetStatus: (quotation: Quotation, status: "cancelled" | "confirmed") => void;
  onView: (quotation: Quotation) => void;
  page: number;
  pageSelected: boolean;
  pageSelectableCount: number;
  rowsPerPage: number;
  selectedQuotationIds: Set<string>;
  onTogglePageSelection: (checked: boolean) => void;
  onToggleSelection: (quotation: Quotation, checked: boolean) => void;
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
                  aria-label="Select quotations on this page"
                  checked={pageSelected}
                  className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pageSelectableCount === 0}
                  onChange={(event) => onTogglePageSelection(event.target.checked)}
                  type="checkbox"
                />
              </th>
              {[
                "Quotation",
                "Date",
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
            {entries.map((quotation, _index) => (
              <tr
                key={quotation.id}
                className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 text-center">
                  <input
                    aria-label={`Select ${quotation.quotationNumber}`}
                    checked={selectedQuotationIds.has(quotation.id)}
                    className="size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canSelectQuotation(quotation)}
                    onChange={(event) => onToggleSelection(quotation, event.target.checked)}
                    title={
                      quotation.generatedSalesInvoiceNo
                        ? `Already invoiced by ${quotation.generatedSalesInvoiceNo}`
                        : undefined
                    }
                    type="checkbox"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                    onClick={() => onView(quotation)}
                    title="View quotation"
                    type="button"
                  >
                    {quotation.quotationNumber}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{formatDate(quotation.date)}</td>
                {visibleColumns.customer ? (
                  <td className="px-4 py-2.5">
                    <button
                      className={cn(
                        "font-medium underline-offset-4",
                        quotation.status === "draft"
                          ? "hover:underline"
                          : "cursor-not-allowed text-muted-foreground"
                      )}
                      disabled={quotation.status !== "draft"}
                      onClick={() => onEdit(quotation)}
                      title={
                        quotation.status === "draft"
                          ? "Edit quotation"
                          : "Submitted quotations cannot be edited"
                      }
                      type="button"
                    >
                      {quotation.customerName}
                    </button>
                  </td>
                ) : null}
                {visibleColumns.items ? (
                  <td className="px-4 py-2.5 text-right">{totalQuotationQuantity(quotation)}</td>
                ) : null}
                {visibleColumns.taxable ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(quotation.subtotal)}</td>
                ) : null}
                {visibleColumns.gst ? (
                  <td className="px-4 py-2.5 text-right">{formatMoney(quotation.taxAmount)}</td>
                ) : null}
                {visibleColumns.total ? (
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatMoney(quotation.amount)}
                  </td>
                ) : null}
                {visibleColumns.status ? (
                  <td className="px-4 py-2.5">
                    <StatusPill quotation={quotation} />
                  </td>
                ) : null}
                {visibleColumns.invoice ? (
                  <td className="px-4 py-2.5 font-semibold text-sky-700">
                    {quotation.generatedSalesInvoiceNo || "-"}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-center">
                  <Button
                    aria-label={`Print ${quotation.quotationNumber}`}
                    className="size-8"
                    onClick={() => onPrint(quotation)}
                    size="icon"
                    title={`Print ${quotation.quotationNumber}`}
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
                        ...(quotation.status === "draft"
                          ? [
                              {
                                id: "confirm",
                                label: "Confirm",
                                icon: <Eye className="size-4" />,
                                onSelect: () => onSetStatus(quotation, "confirmed")
                              }
                            ]
                          : []),
                        ...(canAdminRevoke &&
                        quotation.status === "confirmed" &&
                        !quotation.generatedSalesInvoiceNo
                          ? [
                              {
                                id: "revoke",
                                label: "Revoke by admin",
                                icon: <RotateCcw className="size-4" />,
                                onSelect: () => onRevoke(quotation)
                              }
                            ]
                          : []),
                        ...(quotation.status !== "cancelled" && !quotation.generatedSalesInvoiceNo
                          ? [
                              {
                                id: "suspend",
                                label: "Suspend",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onSetStatus(quotation, "cancelled")
                              }
                            ]
                          : []),
                        ...(quotation.status === "draft"
                          ? [
                              {
                                id: "force-delete",
                                label: "Force delete",
                                icon: <Trash2 className="size-4" />,
                                tone: "destructive" as const,
                                onSelect: () => onForceDelete(quotation)
                              }
                            ]
                          : [])
                      ]}
                      {...(quotation.status === "draft" ? { onEdit: () => onEdit(quotation) } : {})}
                      onView={() => onView(quotation)}
                      title={quotation.quotationNumber}
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
        <WorkspaceTableEmptyState>No quotations found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function StatusPill({
  quotation,
  status
}: {
  quotation?: Quotation;
  status?: Quotation["status"];
}) {
  const label = quotation?.generatedSalesInvoiceNo
    ? "invoiced"
    : (status ?? quotation?.status ?? "draft");
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

export function canSelectQuotation(quotation: Quotation) {
  return quotation.status !== "cancelled" && !quotation.generatedSalesInvoiceNo;
}
