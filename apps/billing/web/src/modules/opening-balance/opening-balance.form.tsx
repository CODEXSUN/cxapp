import { useState } from "react";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspaceSelect } from "@cxapp/ui/workspace/select";
import { WorkspaceSwitchCard } from "@cxapp/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel
} from "@cxapp/ui/workspace/upsert";
import { openingBalanceSchema } from "./opening-balance.schema";
import type { OpeningBalanceData, OpeningBalanceInput } from "./opening-balance.types";

export function OpeningBalanceForm({
  data,
  initial,
  saving,
  error,
  onSave,
  onCancel
}: {
  data: OpeningBalanceData;
  initial: OpeningBalanceInput | null;
  saving: boolean;
  error: string;
  onSave: (input: OpeningBalanceInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<OpeningBalanceInput>(
    initial ?? {
      contactId: 0,
      currencyId: data.currencies[0]?.id ?? 0,
      partyRole: "customer",
      amount: 0,
      reason: "",
      assignLegacy: false
    }
  );
  const [amount, setAmount] = useState(String(form.amount));
  const [validation, setValidation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const contact = data.contacts.find((item) => item.id === form.contactId);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = openingBalanceSchema.safeParse({
          ...form,
          amount: amount.trim() ? Number(amount) : NaN
        });
        if (!result.success) {
          setFieldErrors(
            Object.fromEntries(
              result.error.issues.map((issue) => [String(issue.path[0]), issue.message])
            )
          );
          setValidation(result.error.issues.map((item) => item.message).join(" "));
          return;
        }
        setValidation("");
        setFieldErrors({});
        onSave(result.data);
      }}
    >
      {error || validation ? (
        <WorkspaceFormBanner title="Opening balance could not be saved" tone="error">
          {error || validation}
        </WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormPanel title="Reviewed opening balance">
        <WorkspaceFormGrid>
          <WorkspaceFormField label="Contact" required>
            <WorkspaceLookup
              invalid={Boolean(fieldErrors.contactId)}
              allowTextValue={false}
              value={form.contactId ? String(form.contactId) : ""}
              options={data.contacts.map((item) => ({ value: String(item.id), label: item.name }))}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  contactId: Number(value),
                  assignLegacy: false
                }))
              }
            />
            {fieldErrors.contactId ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.contactId}
              </p>
            ) : null}
          </WorkspaceFormField>
          <WorkspaceFormField label="Party role" required>
            <WorkspaceSelect
              value={form.partyRole}
              options={[
                { value: "customer", label: "Customer" },
                { value: "supplier", label: "Supplier" }
              ]}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  partyRole: value === "supplier" ? "supplier" : "customer",
                  assignLegacy: false
                }))
              }
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Currency" required>
            <WorkspaceSelect
              value={String(form.currencyId)}
              options={data.currencies.map((item) => ({
                value: String(item.id),
                label: item.name
              }))}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, currencyId: Number(value) }))
              }
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Signed opening" required>
            <Input
              inputMode="decimal"
              aria-invalid={Boolean(fieldErrors.amount)}
              className={fieldErrors.amount ? "border-destructive" : undefined}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {fieldErrors.amount ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.amount}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Positive: customer owes you, or you owe supplier. Negative: credit/advance.
            </p>
          </WorkspaceFormField>
          <WorkspaceFormField label="Reason" required>
            <Input
              value={form.reason}
              aria-invalid={Boolean(fieldErrors.reason)}
              className={fieldErrors.reason ? "border-destructive" : undefined}
              onChange={(event) =>
                setForm((current) => ({ ...current, reason: event.target.value }))
              }
            />
            {fieldErrors.reason ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.reason}
              </p>
            ) : null}
          </WorkspaceFormField>
        </WorkspaceFormGrid>
        <p className="my-3 text-sm">
          Legacy contact opening: INR {contact?.legacyAmount.toFixed(2) ?? "0.00"}. Saving does not
          change the contact record.
        </p>
        <WorkspaceSwitchCard
          checked={form.assignLegacy}
          label="Assign reviewed legacy opening to this company/year"
          description="This records its scope and prevents reuse of the legacy opening in other companies or years. Enter the reviewed amount above."
          onCheckedChange={(checked) =>
            setForm((current) => ({ ...current, assignLegacy: checked }))
          }
        />
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save opening"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </WorkspaceFormPanel>
    </form>
  );
}
