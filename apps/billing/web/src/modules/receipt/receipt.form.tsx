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
import { useReceiptFormLookups } from "./receipt.hooks";
import { emptyReceiptContact, ReceiptContactDialog } from "./receipt.contact-dialog";
import { validateReceipt, type ReceiptFormErrors } from "./receipt.schema";
import { createReceiptContact, formatReceiptMoney } from "./receipt.services";
import {
  emptyReceipt,
  receiptToPayload,
  type Receipt,
  type ReceiptAllocationCandidate,
  type ReceiptContext,
  type ReceiptLookupOption,
  type ReceiptMode,
  type ReceiptSavePayload
} from "./receipt.types";

const modes = [
  { label: "Cash", value: "cash" },
  { label: "Bank account", value: "bank" },
  { label: "UPI", value: "upi" },
  { label: "NEFT / RTGS", value: "transfer" }
];

export function ReceiptForm({
  context,
  error,
  receipt,
  saving,
  onCancel,
  onSave
}: {
  context: ReceiptContext | null;
  error?: string | undefined;
  receipt?: Receipt | null | undefined;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: ReceiptSavePayload) => void;
}) {
  const [form, setForm] = useState<ReceiptSavePayload>(() =>
    receipt ? receiptToPayload(receipt) : emptyReceipt(context)
  );
  const [errors, setErrors] = useState<ReceiptFormErrors>({});
  const [tab, setTab] = useState("details");
  const lookups = useReceiptFormLookups(form.customerId);
  const candidates = useMemo(
    () => mergeCandidates(lookups.allocations.data ?? [], receipt),
    [lookups.allocations.data, receipt]
  );
  const total = form.amount + form.tdsAmount - form.discountAmount + form.roundOff;
  const allocated = form.allocations.reduce(
    (sum, item) => sum + Number(item.allocatedAmount || 0),
    0
  );
  const patch = <Key extends keyof ReceiptSavePayload>(key: Key, value: ReceiptSavePayload[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  function changeCustomer(value: string, option?: ReceiptLookupOption | null) {
    patch("customerId", Number(option?.record.id ?? value ?? 0));
    patch("allocations", []);
  }
  function allocationAmount(saleId: string) {
    return form.allocations.find((item) => item.saleId === saleId)?.allocatedAmount ?? 0;
  }
  function setAllocation(saleId: string, amount: number) {
    setForm((current) => ({
      ...current,
      allocations:
        amount > 0
          ? [
              ...current.allocations.filter((item) => item.saleId !== saleId),
              { saleId, allocatedAmount: amount }
            ]
          : current.allocations.filter((item) => item.saleId !== saleId)
    }));
  }
  const details = (
    <WorkspaceFormGrid>
      <WorkspaceFormField label="Customer name" required>
        <WorkspaceLookup
          allowTextValue={false}
          createLabel="New customer"
          createMode="popup"
          createTitle="New customer"
          createDescription="Add customer details without leaving this receipt."
          invalid={Boolean(errors.customerId)}
          loading={lookups.contacts.isLoading}
          options={lookups.contacts.data ?? []}
          placeholder="Search customer"
          required
          value={form.customerId ? String(form.customerId) : ""}
          renderCreateForm={({ initialName, onCancel, onCreated }) => (
            <ReceiptContactDialog
              initialValue={emptyReceiptContact(initialName)}
              onCancel={onCancel}
              onSave={async (payload) => {
                const created = await createReceiptContact(payload);
                await lookups.contacts.refetch();
                const option: ReceiptLookupOption = {
                  label: created.name || String(created.id),
                  record: created,
                  value: String(created.id)
                };
                onCreated(option);
                changeCustomer(option.value, option);
                toast.success("Contact saved", { description: option.label });
              }}
            />
          )}
          onValueChange={(value, option) =>
            changeCustomer(value, option as ReceiptLookupOption | null | undefined)
          }
        />
        {errors.customerId ? <FieldError>{errors.customerId}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Receipt no">
        <Input
          value={form.receiptNumber}
          onChange={(event) => patch("receiptNumber", event.target.value)}
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
          value={form.receiptDate}
          onValueChange={(value) => patch("receiptDate", value)}
        />
        {errors.receiptDate ? <FieldError>{errors.receiptDate}</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Mode of payment">
        <WorkspaceSelect
          ariaLabel="Mode of payment"
          options={modes}
          value={form.receiptMode}
          onValueChange={(value) => patch("receiptMode", value as ReceiptMode)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField
        label={form.receiptMode === "cash" ? "Cash ledger" : "Bank ledger"}
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
              Number((option as ReceiptLookupOption | undefined)?.record.id ?? value ?? 0)
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
      {!form.customerId ? (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          Select a customer to load confirmed sales invoices.
        </p>
      ) : null}
      {form.customerId && !candidates.length ? (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No outstanding confirmed sales invoices were found.
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
                <tr className="border-b last:border-0" key={candidate.saleId}>
                  <td className="px-4 py-3 font-medium">{candidate.documentNo}</td>
                  <td className="px-4 py-3">{candidate.documentDate}</td>
                  <td className="px-4 py-3">{formatReceiptMoney(candidate.documentTotal)}</td>
                  <td className="px-4 py-3">{formatReceiptMoney(candidate.outstandingAmount)}</td>
                  <td className="px-4 py-3">
                    <Input
                      className="w-36"
                      max={candidate.outstandingAmount}
                      min="0"
                      step="0.01"
                      type="number"
                      value={allocationAmount(candidate.saleId)}
                      onChange={(event) =>
                        setAllocation(candidate.saleId, Number(event.target.value))
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
        <Summary label="Receipt total" value={formatReceiptMoney(total)} />
        <Summary label="Allocated" value={formatReceiptMoney(allocated)} />
        <Summary label="Unallocated" value={formatReceiptMoney(total - allocated)} />
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
      description="Create an incoming receipt with sales invoice allocations."
      onBack={onCancel}
      title={receipt ? "Edit receipt" : "New receipt"}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = validateReceipt(form);
          setErrors(result.errors);
          if (!result.data) return;
          if (
            result.data.allocations.reduce((sum, item) => sum + item.allocatedAmount, 0) > total
          ) {
            setErrors({ allocations: "Allocated amount cannot exceed the receipt total." });
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
                {saving ? "Saving..." : receipt ? "Update" : "Save"}
              </Button>
              <Button onClick={onCancel} type="button" variant="outline">
                <X className="size-4" />
                Cancel
              </Button>
            </WorkspaceFormActions>
          }
        >
          {Object.keys(errors).length || error ? (
            <WorkspaceFormBanner title="Receipt could not be saved">
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

function mergeCandidates(candidates: ReceiptAllocationCandidate[], receipt?: Receipt | null) {
  const merged = new Map(candidates.map((item) => [item.saleId, item]));
  for (const item of receipt?.allocations ?? [])
    if (!merged.has(item.saleId))
      merged.set(item.saleId, {
        customerId: receipt!.customerId,
        documentDate: item.documentDate,
        documentNo: item.documentNo,
        documentTotal: item.documentTotal,
        outstandingAmount: item.previousBalance,
        saleId: item.saleId
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
