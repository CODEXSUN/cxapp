import { Eye, Printer, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspaceRowActions } from "@cxapp/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxapp/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxapp/ui/workspace/table";
import { cn } from "@cxapp/ui/lib/utils";
import {
  BillingDocumentTotalsTable,
  type BillingDocumentReportRecord,
  type BillingDocumentTotalsViewMode
} from "../../shared/document/document-totals-report";
import { formatDate, formatMoney, totalSaleQuantity } from "./sales.services";
import type { Sale } from "./sales.types";

export function SalesList({
  canAdminRevoke,
  entries,
  loading,
  onEdit,
  onForceDelete,
  onPrint,
  onRevoke,
  onSetStatus,
  onView,
  totalsRecords,
  totalsView,
  visibleColumns
}: {
  canAdminRevoke: boolean;
  entries: Sale[];
  loading: boolean;
  onEdit: (sale: Sale) => void;
  onForceDelete: (sale: Sale) => void;
  onPrint: (sale: Sale) => void;
  onRevoke: (sale: Sale) => void;
  onSetStatus: (sale: Sale, status: "cancelled" | "confirmed") => void;
  onView: (sale: Sale) => void;
  totalsRecords: BillingDocumentReportRecord[];
  totalsView: BillingDocumentTotalsViewMode;
  visibleColumns: Record<string, boolean>;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          {totalsView === "bill" ? (
            <>
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Sale",
                    ...(visibleColumns.date ? ["Date"] : []),
                    ...(visibleColumns.customer ? ["Customer"] : []),
                    ...(visibleColumns.items ? ["QTY"] : []),
                    ...(visibleColumns.taxable ? ["Taxable"] : []),
                    ...(visibleColumns.gst ? ["GST"] : []),
                    ...(visibleColumns.total ? ["Total"] : []),
                    ...(visibleColumns.status ? ["Status"] : []),
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
                {entries.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5">
                      <button
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                        onClick={() => onView(sale)}
                        title="View sale"
                        type="button"
                      >
                        {sale.saleNumber}
                      </button>
                    </td>
                    {visibleColumns.date ? (
                      <td className="whitespace-nowrap px-4 py-2.5">{formatDate(sale.issuedOn)}</td>
                    ) : null}
                    {visibleColumns.customer ? (
                      <td className="px-4 py-2.5">
                        <button
                          className={cn(
                            "font-medium underline-offset-4",
                            sale.status === "draft"
                              ? "hover:underline"
                              : "cursor-not-allowed text-muted-foreground"
                          )}
                          disabled={sale.status !== "draft"}
                          onClick={() => onEdit(sale)}
                          title={
                            sale.status === "draft"
                              ? "Edit sale"
                              : "Submitted sales cannot be edited"
                          }
                          type="button"
                        >
                          {sale.customerName}
                        </button>
                      </td>
                    ) : null}
                    {visibleColumns.items ? (
                      <td className="px-4 py-2.5 text-right">{totalSaleQuantity(sale)}</td>
                    ) : null}
                    {visibleColumns.taxable ? (
                      <td className="px-4 py-2.5 text-right">{formatMoney(sale.subtotal)}</td>
                    ) : null}
                    {visibleColumns.gst ? (
                      <td className="px-4 py-2.5 text-right">{formatMoney(sale.taxAmount)}</td>
                    ) : null}
                    {visibleColumns.total ? (
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatMoney(sale.amount)}
                      </td>
                    ) : null}
                    {visibleColumns.status ? (
                      <td className="px-4 py-2.5">
                        <StatusPill sale={sale} />
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        aria-label={`Print ${sale.saleNumber}`}
                        className="size-8"
                        onClick={() => onPrint(sale)}
                        size="icon"
                        title={`Print ${sale.saleNumber}`}
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
                            ...(sale.status === "draft"
                              ? [
                                  {
                                    id: "confirm",
                                    label: "Confirm",
                                    icon: <Eye className="size-4" />,
                                    onSelect: () => onSetStatus(sale, "confirmed")
                                  }
                                ]
                              : []),
                            ...(canAdminRevoke &&
                            sale.status === "confirmed" &&
                            !sale.generatedSalesInvoiceNo
                              ? [
                                  {
                                    id: "revoke",
                                    label: "Revoke by admin",
                                    icon: <RotateCcw className="size-4" />,
                                    onSelect: () => onRevoke(sale)
                                  }
                                ]
                              : []),
                            ...(sale.status !== "cancelled" && !sale.generatedSalesInvoiceNo
                              ? [
                                  {
                                    id: "suspend",
                                    label: "Suspend",
                                    icon: <Trash2 className="size-4" />,
                                    tone: "destructive" as const,
                                    onSelect: () => onSetStatus(sale, "cancelled")
                                  }
                                ]
                              : []),
                            ...(sale.status === "draft"
                              ? [
                                  {
                                    id: "force-delete",
                                    label: "Force delete",
                                    icon: <Trash2 className="size-4" />,
                                    tone: "destructive" as const,
                                    onSelect: () => onForceDelete(sale)
                                  }
                                ]
                              : [])
                          ]}
                          {...(sale.status === "draft" ? { onEdit: () => onEdit(sale) } : {})}
                          onView={() => onView(sale)}
                          title={sale.saleNumber}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <BillingDocumentTotalsTable records={totalsRecords} />
          )}
        </table>
      </div>
      {entries.length === 0 && loading ? <WorkspaceTableLoadingState /> : null}
      {entries.length === 0 && !loading ? (
        <WorkspaceTableEmptyState>No sales found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function StatusPill({ sale, status }: { sale?: Sale; status?: Sale["status"] }) {
  const label = sale?.generatedSalesInvoiceNo ? "invoiced" : (status ?? sale?.status ?? "draft");
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
