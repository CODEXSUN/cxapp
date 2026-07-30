import { Eye, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import { formatPaymentDate, formatPaymentMoney } from "./payment.services";
import type { Payment } from "./payment.types";

export function PaymentList({
  entries,
  loading,
  onCancel,
  onDelete,
  onEdit,
  onPost,
  onView
}: {
  entries: Payment[];
  loading: boolean;
  onCancel: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
  onEdit: (payment: Payment) => void;
  onPost: (payment: Payment) => void;
  onView: (payment: Payment) => void;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Payment no",
                "Date",
                "Supplier",
                "Mode",
                "Amount",
                "Unallocated",
                "Status",
                "Action"
              ].map((label) => (
                <th
                  className="border-b border-border/70 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((payment) => (
              <tr
                className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/20"
                key={payment.id}
                onClick={() => onView(payment)}
              >
                <td className="px-4 py-3 font-semibold">{payment.paymentNumber}</td>
                <td className="px-4 py-3">{formatPaymentDate(payment.paymentDate)}</td>
                <td className="px-4 py-3">{payment.supplierName}</td>
                <td className="px-4 py-3 capitalize">{payment.paymentMode}</td>
                <td className="px-4 py-3 font-medium">{formatPaymentMoney(payment.totalAmount)}</td>
                <td className="px-4 py-3">{formatPaymentMoney(payment.unallocatedAmount)}</td>
                <td className="px-4 py-3">
                  <PaymentStatus payment={payment} />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <WorkspaceRowActions
                    actions={[
                      {
                        id: "view",
                        icon: <Eye className="size-4" />,
                        label: "View",
                        onSelect: () => onView(payment)
                      },
                      ...(payment.status === "draft"
                        ? [
                            {
                              id: "edit",
                              icon: <Pencil className="size-4" />,
                              label: "Edit",
                              onSelect: () => onEdit(payment)
                            },
                            {
                              id: "post",
                              icon: <Send className="size-4" />,
                              label: "Post",
                              onSelect: () => onPost(payment)
                            },
                            {
                              id: "delete",
                              icon: <Trash2 className="size-4" />,
                              label: "Delete draft",
                              tone: "destructive" as const,
                              onSelect: () => onDelete(payment)
                            }
                          ]
                        : []),
                      ...(payment.status === "posted"
                        ? [
                            {
                              id: "cancel",
                              icon: <XCircle className="size-4" />,
                              label: "Cancel",
                              tone: "destructive" as const,
                              onSelect: () => onCancel(payment)
                            }
                          ]
                        : [])
                    ]}
                    title={payment.paymentNumber}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !entries.length ? (
        <WorkspaceTableEmptyState>
          No payments found. Create the first payment voucher for this tenant.
        </WorkspaceTableEmptyState>
      ) : null}
      {loading ? <WorkspaceTableLoadingState /> : null}
    </WorkspaceTablePanel>
  );
}
function PaymentStatus({ payment }: { payment: Payment }) {
  const tone =
    payment.status === "posted" ? "success" : payment.status === "cancelled" ? "danger" : "warning";
  return <WorkspaceStatusBadge label={payment.status} status={payment.status} tone={tone} />;
}
