import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { bankNamesSchema } from "./bank-names.schema";
import type { BankNamesRecord, BankNamesSavePayload } from "./bank-names.types";

const emptyBankNames: BankNamesSavePayload = {
  name: "",
  isActive: true,
  sortOrder: 1000
};

export function BankNamesForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: BankNamesSavePayload) => void;
  open: boolean;
  record: BankNamesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the bank name details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} bank name`}
    >
      <BankNamesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyBankNames}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function BankNamesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: BankNamesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: BankNamesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = bankNamesSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setValidationError("");
        onSubmit(value);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="Name">
          <Input
            autoFocus
            type="text"
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Sort order">
          <Input
            min={0}
            type="number"
            value={value.sortOrder}
            onChange={(event) =>
              setValue((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Bank name active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save bank name"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save bank name
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: BankNamesRecord): BankNamesSavePayload {
  return { name: record.name, isActive: record.isActive, sortOrder: record.sortOrder };
}
