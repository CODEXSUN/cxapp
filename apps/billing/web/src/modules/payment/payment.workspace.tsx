import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  usePaymentActivity,
  usePaymentContext,
  usePaymentPage,
  paymentQueryKey
} from "./payment.hooks";
import { PaymentForm } from "./payment.form";
import { PaymentList } from "./payment.list";
import { PaymentPrint } from "./payment.print";
import {
  cancelPayment,
  createPayment,
  deletePayment,
  formatPaymentMoney,
  getPayment,
  postPayment,
  updatePayment
} from "./payment.services";
import type { Payment, PaymentSavePayload, PaymentView } from "./payment.types";

const statusFilters = [
  { id: "all", label: "All payments" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" }
];

export function PaymentWorkspace({ initialRecordId }: { initialRecordId?: string | undefined }) {
  const queryClient = useQueryClient();
  const contextQuery = usePaymentContext();
  const [view, setView] = useState<PaymentView>({ mode: "list" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const paymentsQuery = usePaymentPage({
    page,
    pageSize: rowsPerPage,
    search,
    status: statusFilter
  });
  useEffect(() => {
    if (!initialRecordId) return;
    let active = true;
    void getPayment(initialRecordId)
      .then((payment) => {
        if (active) setView({ mode: "show", payment });
      })
      .catch((error) => {
        if (active) toast.error("Payment could not be opened", { description: message(error) });
      });
    return () => {
      active = false;
    };
  }, [initialRecordId]);
  const save = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: PaymentSavePayload }) =>
      id ? updatePayment(id, payload) : createPayment(payload),
    onSuccess: async (payment) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success("Payment saved", { description: payment.paymentNumber });
      setView({ mode: "show", payment });
    }
  });
  const lifecycle = useMutation({
    mutationFn: ({ action, id }: { action: "post" | "cancel"; id: string }) =>
      action === "post" ? postPayment(id) : cancelPayment(id),
    onSuccess: async (payment) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success(`Payment ${payment.status}`);
      setView({ mode: "show", payment });
    },
    onError: (error) => toast.error("Payment action failed", { description: message(error) })
  });
  const remove = useMutation({
    mutationFn: deletePayment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success("Draft payment deleted");
      setView({ mode: "list" });
    },
    onError: (error) => toast.error("Payment could not be deleted", { description: message(error) })
  });
  const entries = paymentsQuery.data?.items ?? [];
  const totalCount = paymentsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageEntries = entries;
  if (view.mode === "upsert")
    return (
      <PaymentForm
        context={contextQuery.data ?? null}
        error={save.error ? message(save.error) : undefined}
        payment={view.payment}
        saving={save.isPending}
        onCancel={() =>
          setView(
            view.returnTo === "show" && view.payment
              ? { mode: "show", payment: view.payment }
              : { mode: "list" }
          )
        }
        onSave={(payload) =>
          save.mutate({ ...(view.payment ? { id: view.payment.id } : {}), payload })
        }
      />
    );
  if (view.mode === "show")
    return (
      <PaymentShow
        payment={view.payment}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "upsert", payment: view.payment, returnTo: "show" })}
        onPost={() => lifecycle.mutate({ action: "post", id: view.payment.id })}
        onCancel={() => lifecycle.mutate({ action: "cancel", id: view.payment.id })}
      />
    );
  return (
    <WorkspacePage
      action={
        <div className="flex gap-2">
          <Button onClick={() => void paymentsQuery.refetch()} type="button" variant="outline">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              void contextQuery.refetch();
              setView({ mode: "upsert", payment: null, returnTo: "list" });
            }}
            type="button"
          >
            <Plus className="size-4" />
            New payment
          </Button>
        </div>
      }
      description="Create, review, allocate, post, and print tenant-isolated payment vouchers."
      title="Payments"
    >
      <WorkspaceFilters
        filterOptions={statusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search payment, supplier, ledger, mode, or status"
        searchValue={search}
      />
      {paymentsQuery.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {message(paymentsQuery.error)}
        </p>
      ) : null}
      <PaymentList
        entries={pageEntries}
        loading={paymentsQuery.isLoading}
        onView={(payment) => setView({ mode: "show", payment })}
        onEdit={(payment) => setView({ mode: "upsert", payment, returnTo: "list" })}
        onPost={(payment) =>
          confirmAction(`Post ${payment.paymentNumber}?`, () =>
            lifecycle.mutate({ action: "post", id: payment.id })
          )
        }
        onCancel={(payment) =>
          confirmAction(`Cancel ${payment.paymentNumber}?`, () =>
            lifecycle.mutate({ action: "cancel", id: payment.id })
          )
        }
        onDelete={(payment) =>
          confirmAction(`Delete draft ${payment.paymentNumber}?`, () => remove.mutate(payment.id))
        }
      />
      <WorkspacePagination
        onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
        page={page}
        rowsPerPage={rowsPerPage}
        showingLabel={showingLabel(totalCount, page, rowsPerPage)}
        singularLabel="payment"
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </WorkspacePage>
  );
}

function PaymentShow({
  payment,
  onBack,
  onCancel,
  onEdit,
  onPost
}: {
  payment: Payment;
  onBack: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onPost: () => void;
}) {
  const activityQuery = usePaymentActivity(payment.id);
  return (
    <WorkspacePage
      action={
        <div className="flex gap-2">
          {payment.status === "draft" ? (
            <>
              <Button onClick={onEdit} type="button" variant="outline">
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button onClick={onPost} type="button">
                Post
              </Button>
            </>
          ) : null}
          {payment.status === "posted" ? (
            <Button onClick={onCancel} type="button" variant="destructive">
              Cancel
            </Button>
          ) : null}
          <Button onClick={() => window.print()} type="button" variant="outline">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      }
      description={`${payment.supplierName} • ${payment.paymentDate}`}
      onBack={onBack}
      title={payment.paymentNumber}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PaymentPrint payment={payment} />
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Payment summary</h2>
            <WorkspaceStatusBadge status={payment.status} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <Summary label="Company" value={payment.companyName} />
            <Summary label="Financial year" value={payment.financialYearName} />
            <Summary label="Ledger" value={payment.ledgerName} />
            <Summary label="Amount" value={formatPaymentMoney(payment.amount)} />
            <Summary label="Allocated" value={formatPaymentMoney(payment.allocatedAmount)} />
            <Summary label="Unallocated" value={formatPaymentMoney(payment.unallocatedAmount)} />
            <Summary label="Total" value={formatPaymentMoney(payment.totalAmount)} />
          </dl>
        </div>
      </div>
      <WorkspaceShowCard title="Activity">
        <div className="divide-y divide-border/60">
          {activityQuery.isLoading ? (
            <GlobalLoader className="min-h-28" fullScreen={false} />
          ) : null}
          {activityQuery.isError ? (
            <p className="px-4 py-3 text-sm text-destructive">{message(activityQuery.error)}</p>
          ) : null}
          {!activityQuery.isLoading && !activityQuery.isError && !activityQuery.data?.length ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No activity yet.</p>
          ) : null}
          {(activityQuery.data ?? []).map((activity) => (
            <div className="px-4 py-3" key={activity.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium capitalize">{activity.action}</p>
                <time className="text-xs text-muted-foreground">
                  {formatActivityDate(activity.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
            </div>
          ))}
        </div>
      </WorkspaceShowCard>
    </WorkspacePage>
  );
}
function formatActivityDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
function showingLabel(total: number, page: number, rows: number) {
  if (!total) return "Showing 0 payments";
  return `Showing ${(page - 1) * rows + 1}-${Math.min(page * rows, total)} of ${total}`;
}
function confirmAction(question: string, action: () => void) {
  if (window.confirm(question)) action();
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected Payment error occurred.";
}
