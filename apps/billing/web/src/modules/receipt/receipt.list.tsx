import { Eye, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import { formatReceiptDate, formatReceiptMoney } from "./receipt.services";
import type { Receipt } from "./receipt.types";

export function ReceiptList({
  entries,
  loading,
  onCancel,
  onDelete,
  onEdit,
  onPost,
  onView
}: {
  entries: Receipt[];
  loading: boolean;
  onCancel: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
  onEdit: (receipt: Receipt) => void;
  onPost: (receipt: Receipt) => void;
  onView: (receipt: Receipt) => void;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                "Receipt no",
                "Date",
                "Customer",
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
            {entries.map((receipt) => (
              <tr
                className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/20"
                key={receipt.id}
                onClick={() => onView(receipt)}
              >
                <td className="px-4 py-3 font-semibold">{receipt.receiptNumber}</td>
                <td className="px-4 py-3">{formatReceiptDate(receipt.receiptDate)}</td>
                <td className="px-4 py-3">{receipt.customerName}</td>
                <td className="px-4 py-3 capitalize">{receipt.receiptMode}</td>
                <td className="px-4 py-3 font-medium">{formatReceiptMoney(receipt.totalAmount)}</td>
                <td className="px-4 py-3">{formatReceiptMoney(receipt.unallocatedAmount)}</td>
                <td className="px-4 py-3">
                  <ReceiptStatus receipt={receipt} />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <WorkspaceRowActions
                    actions={[
                      {
                        id: "view",
                        icon: <Eye className="size-4" />,
                        label: "View",
                        onSelect: () => onView(receipt)
                      },
                      ...(receipt.status === "draft"
                        ? [
                            {
                              id: "edit",
                              icon: <Pencil className="size-4" />,
                              label: "Edit",
                              onSelect: () => onEdit(receipt)
                            },
                            {
                              id: "post",
                              icon: <Send className="size-4" />,
                              label: "Post",
                              onSelect: () => onPost(receipt)
                            },
                            {
                              id: "delete",
                              icon: <Trash2 className="size-4" />,
                              label: "Delete draft",
                              tone: "destructive" as const,
                              onSelect: () => onDelete(receipt)
                            }
                          ]
                        : []),
                      ...(receipt.status === "posted"
                        ? [
                            {
                              id: "cancel",
                              icon: <XCircle className="size-4" />,
                              label: "Cancel",
                              tone: "destructive" as const,
                              onSelect: () => onCancel(receipt)
                            }
                          ]
                        : [])
                    ]}
                    title={receipt.receiptNumber}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !entries.length ? (
        <WorkspaceTableEmptyState>
          No receipts found. Create the first receipt voucher for this tenant.
        </WorkspaceTableEmptyState>
      ) : null}
      {loading ? <WorkspaceTableLoadingState /> : null}
    </WorkspaceTablePanel>
  );
}
function ReceiptStatus({ receipt }: { receipt: Receipt }) {
  const tone =
    receipt.status === "posted" ? "success" : receipt.status === "cancelled" ? "danger" : "warning";
  return <WorkspaceStatusBadge label={receipt.status} status={receipt.status} tone={tone} />;
}
