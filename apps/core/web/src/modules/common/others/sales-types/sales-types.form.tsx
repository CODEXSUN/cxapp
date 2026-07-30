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
import { salesTypesSchema } from "./sales-types.schema";
import type { SalesTypesRecord, SalesTypesSavePayload } from "./sales-types.types";

const emptySalesTypes: SalesTypesSavePayload = {
  name: "",
  description: "",
  isActive: true,
  sortOrder: 1000
};

export function SalesTypesForm({
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
  onSubmit: (payload: SalesTypesSavePayload) => void;
  open: boolean;
  record: SalesTypesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the sales type details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} sales type`}
    >
      <SalesTypesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptySalesTypes}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function SalesTypesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: SalesTypesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: SalesTypesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = salesTypesSchema.safeParse(value);
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
        <WorkspaceFormField label="Description">
          <Input
            type="text"
            value={value.description ?? ""}
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
          ariaLabel="Sales type active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save sales type"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save sales type
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: SalesTypesRecord): SalesTypesSavePayload {
  return {
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
