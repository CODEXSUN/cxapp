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
import { taxesSchema } from "./taxes.schema";
import type { TaxesRecord, TaxesSavePayload } from "./taxes.types";

const emptyTaxes: TaxesSavePayload = {
  ratePercent: 0,
  description: "",
  isActive: true,
  sortOrder: 1000
};

export function TaxesForm({
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
  onSubmit: (payload: TaxesSavePayload) => void;
  open: boolean;
  record: TaxesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the tax details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} tax`}
    >
      <TaxesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyTaxes}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function TaxesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: TaxesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: TaxesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = taxesSchema.safeParse(value);
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
        <WorkspaceFormField label="Rate percent">
          <Input
            autoFocus
            type="number"
            value={value.ratePercent}
            onChange={(event) =>
              setValue((current) => ({ ...current, ratePercent: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Description">
          <Input
            type="text"
            value={value.description}
            onChange={(event) =>
              setValue((current) => ({ ...current, description: event.target.value }))
            }
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
          ariaLabel="Tax active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save tax"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save tax
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: TaxesRecord): TaxesSavePayload {
  return {
    ratePercent: record.ratePercent,
    description: record.description,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
