import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { Textarea } from "@codexsun/ui/components/textarea";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel
} from "@codexsun/ui/workspace/upsert";
import { usePaymentFormLookups } from "./payment.hooks";
import { emptyPaymentContact, PaymentContactDialog } from "./payment.contact-dialog";
import { validatePayment, type PaymentFormErrors } from "./payment.schema";
import { createPaymentContact, formatPaymentMoney } from "./payment.services";
import {
  emptyPayment,
  paymentToPayload,
  type Payment,
  type PaymentAllocationCandidate,
  type PaymentContext,
  type PaymentLookupOption,
  type PaymentMode,
  type PaymentSavePayload
} from "./payment.types";

const modes = [
  { label: "Cash", value: "cash" },
  { label: "Bank account", value: "bank" },
  { label: "UPI", value: "upi" },
  { label: "NEFT / RTGS", value: "transfer" }
];

export function PaymentForm({
  context,
  error,
  payment,
  saving,
  onCancel,
  onSave
}: {
  context: PaymentContext | null;
  error?: string | undefined;
  payment?: Payment | null | undefined;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: PaymentSavePayload) => void;
}) {
  const [form, setForm] = useState<PaymentSavePayload>(() =>
    payment ? paymentToPayload(payment) : emptyPayment(context)
  );
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [tab, setTab] = useState("details");
  const lookups = usePaymentFormLookups(form.supplierId);
  const candidates = useMemo(
    () => mergeCandidates(lookups.allocations.data ?? [], payment),
    [lookups.allocations.data, payment]
  );
  const total = form.amount + form.tdsAmount - form.discountAmount + form.roundOff;
  const allocated = form.allocations.reduce(
    (sum, item) => sum + Number(item.allocatedAmount || 0),
    0
  );
  const patch = <Key extends keyof PaymentSavePayload>(key: Key, value: PaymentSavePayload[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  function changeSupplier(value: string, option?: PaymentLookupOption | null) {
    patch("supplierId", Number(option?.record.id ?? value ?? 0));
    patch("allocations", []);
  }
  function allocationAmount(purchaseId: string) {
    return form.allocations.find((item) => item.purchaseId === purchaseId)?.allocatedAmount ?? 0;
  }
  function setAllocation(purchaseId: string, amount: number) {
    setForm((current) => ({
      ...current,
      allocations:
        amount > 0
          ? [
              ...current.allocations.filter((item) => item.purchaseId !== purchaseId),
              { purchaseId, allocatedAmount: amount }
            ]
          : current.allocations.filter((item) => item.purchaseId !== purchaseId)
    }));
  }
  const details = (
    <WorkspaceFormGrid>
      <WorkspaceFormField label="Supplier name" required>
        <WorkspaceLookup
          allowTextValue={false}
          createLabel="New supplier"
          createMode="popup"
          createTitle="New supplier"
          createDescription="Add supplier details without leaving this payment."
          invalid={Boolean(errors.supplierId)}
          loading={lookups.contacts.isLoading}
          options={lookups.contacts.data ?? []}
          placeholder="Search supplier"
          required
          value={form.supplierId ? String(form.supplierId) : ""}
          renderCreateForm={({ initialName, onCancel, onCreated }) => (
            <PaymentContactDialog
              initialValue={emptyPaymentContact(initialName)}
              onCancel={onCancel}
              onSave={async (payload) => {
                const created = await createPaymentContact(payload);
                await lookups.contacts.refetch();
                const option: PaymentLookupOption = {
                  label: created.name || String(created.id),
                  record: created,
                  value: String(created.id)
                };
                onCreated(option);
                changeSupplier(option.value, option);
                toast.success("Contact saved", { description: option.label });
              }}
            />
          )}
          onValueChange={(value, option) =>
            changeSupplier(value, option as PaymentLookupOption | null | undefined)
          }
        />
        {errors.supplierId ? <FieldError>{errors.supplierId}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Payment no">
        <Input
          value={form.paymentNumber}
          onChange={(event) => patch("paymentNumber", event.target.value)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Amount" required>
        <Input
          className={invalidClass(errors.amount)}
          min="0"
          step="0.01"
          type="number"
          value={form.amount}
          onChange={(event) => patch("amount", Number(event.target.value))}
        />
        {errors.amount ? <FieldError>{errors.amount}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Date" required>
        <WorkspaceDatePicker
          required
          value={form.paymentDate}
          onValueChange={(value) => patch("paymentDate", value)}
        />
        {errors.paymentDate ? <FieldError>{errors.paymentDate}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Mode of payment">
        <WorkspaceSelect
          ariaLabel="Mode of payment"
          options={modes}
          value={form.paymentMode}
          onValueChange={(value) => patch("paymentMode", value as PaymentMode)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField
        label={form.paymentMode === "cash" ? "Cash ledger" : "Bank ledger"}
        required
      >
        <WorkspaceLookup
          allowTextValue={false}
          invalid={Boolean(errors.ledgerId)}
          loading={lookups.ledgers.isLoading}
          options={lookups.ledgers.data ?? []}
          placeholder="Search ledger"
          required
          value={form.ledgerId ? String(form.ledgerId) : ""}
          onValueChange={(value, option) =>
            patch(
              "ledgerId",
              Number((option as PaymentLookupOption | undefined)?.record.id ?? value ?? 0)
            )
          }
        />
        {errors.ledgerId ? <FieldError>{errors.ledgerId}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField className="md:col-span-2" label="Notes">
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(event) => patch("notes", event.target.value)}
        />
      </WorkspaceFormField>
    </WorkspaceFormGrid>
  );
  const adjustments = (
    <WorkspaceFormGrid>
      <WorkspaceFormField label="Reference no">
        <Input
          value={form.referenceNo}
          onChange={(event) => patch("referenceNo", event.target.value)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Reference date">
        <WorkspaceDatePicker
          value={form.referenceDate}
          onValueChange={(value) => patch("referenceDate", value)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="TDS amount">
        <Input
          min="0"
          step="0.01"
          type="number"
          value={form.tdsAmount}
          onChange={(event) => patch("tdsAmount", Number(event.target.value))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Discount amount">
        <Input
          min="0"
          step="0.01"
          type="number"
          value={form.discountAmount}
          onChange={(event) => patch("discountAmount", Number(event.target.value))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Round off">
        <Input
          step="0.01"
          type="number"
          value={form.roundOff}
          onChange={(event) => patch("roundOff", Number(event.target.value))}
        />
      </WorkspaceFormField>
    </WorkspaceFormGrid>
  );
  const allocations = (
    <div className="space-y-4">
      {!form.supplierId ? (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          Select a supplier to load confirmed purchase invoices.
        </p>
      ) : null}
      {form.supplierId && !candidates.length ? (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No outstanding confirmed purchase invoices were found.
        </p>
      ) : null}
      {candidates.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Invoice", "Date", "Invoice total", "Outstanding", "Allocate"].map((label) => (
                  <th
                    className="border-b px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                    key={label}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr className="border-b last:border-0" key={candidate.purchaseId}>
                  <td className="px-4 py-3 font-medium">{candidate.documentNo}</td>
                  <td className="px-4 py-3">{candidate.documentDate}</td>
                  <td className="px-4 py-3">{formatPaymentMoney(candidate.documentTotal)}</td>
                  <td className="px-4 py-3">{formatPaymentMoney(candidate.outstandingAmount)}</td>
                  <td className="px-4 py-3">
                    <Input
                      className="w-36"
                      max={candidate.outstandingAmount}
                      min="0"
                      step="0.01"
                      type="number"
                      value={allocationAmount(candidate.purchaseId)}
                      onChange={(event) =>
                        setAllocation(candidate.purchaseId, Number(event.target.value))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="ml-auto grid max-w-sm gap-2 rounded-md border bg-muted/20 p-4 text-sm">
        <Summary label="Payment total" value={formatPaymentMoney(total)} />
        <Summary label="Allocated" value={formatPaymentMoney(allocated)} />
        <Summary label="Unallocated" value={formatPaymentMoney(total - allocated)} />
      </div>
    </div>
  );
  const tabs: WorkspaceAnimatedTab[] = [
    { value: "details", label: "Details", content: details },
    { value: "adjustments", label: "Adjustments", content: adjustments },
    { value: "allocations", label: "Allocations", content: allocations }
  ];
  return (
    <WorkspacePage
      description="Create an outgoing payment with purchase invoice allocations."
      onBack={onCancel}
      title={payment ? "Edit payment" : "New payment"}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = validatePayment(form);
          setErrors(result.errors);
          if (!result.data) return;
          if (
            result.data.allocations.reduce((sum, item) => sum + item.allocatedAmount, 0) > total
          ) {
            setErrors({ allocations: "Allocated amount cannot exceed the payment total." });
            setTab("allocations");
            return;
          }
          onSave(result.data);
        }}
      >
        <WorkspaceFormPanel
          footer={
            <WorkspaceFormActions>
              <Button disabled={saving} type="submit">
                <Save className="size-4" />
                {saving ? "Saving..." : payment ? "Update" : "Save"}
              </Button>
              <Button onClick={onCancel} type="button" variant="outline">
                <X className="size-4" />
                Cancel
              </Button>
            </WorkspaceFormActions>
          }
        >
          {Object.keys(errors).length || error ? (
            <WorkspaceFormBanner title="Payment could not be saved">
              {error || Object.values(errors)[0]}
            </WorkspaceFormBanner>
          ) : null}
          <WorkspaceAnimatedTabs
            contentClassName="min-h-[25rem]"
            onValueChange={setTab}
            tabs={tabs}
            value={tab}
          />
        </WorkspaceFormPanel>
      </form>
    </WorkspacePage>
  );
}

function mergeCandidates(candidates: PaymentAllocationCandidate[], payment?: Payment | null) {
  const merged = new Map(candidates.map((item) => [item.purchaseId, item]));
  for (const item of payment?.allocations ?? [])
    if (!merged.has(item.purchaseId))
      merged.set(item.purchaseId, {
        supplierId: payment!.supplierId,
        documentDate: item.documentDate,
        documentNo: item.documentNo,
        documentTotal: item.documentTotal,
        outstandingAmount: item.previousBalance,
        purchaseId: item.purchaseId
      });
  return [...merged.values()];
}
function invalidClass(error?: string) {
  return error ? "border-destructive focus-visible:ring-destructive" : undefined;
}
function FieldError({ children }: { children: string }) {
  return <p className="text-xs text-destructive">{children}</p>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
