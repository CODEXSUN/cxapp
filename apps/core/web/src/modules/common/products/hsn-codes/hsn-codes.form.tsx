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
import { hsnCodesSchema } from "./hsn-codes.schema";
import type { HsnCodesRecord, HsnCodesSavePayload } from "./hsn-codes.types";

const emptyHsnCodes: HsnCodesSavePayload = {
  code: "",
  description: "",
  isActive: true,
  sortOrder: 1000
};

export function HsnCodesForm({
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
  onSubmit: (payload: HsnCodesSavePayload) => void;
  open: boolean;
  record: HsnCodesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the hsn code details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} hsn code`}
    >
      <HsnCodesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyHsnCodes}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function HsnCodesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: HsnCodesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: HsnCodesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = hsnCodesSchema.safeParse(value);
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
        <WorkspaceFormField label="Code">
          <Input
            autoFocus
            type="text"
            value={value.code}
            onChange={(event) => setValue((current) => ({ ...current, code: event.target.value }))}
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
          ariaLabel="HSN code active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save hsn code"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save hsn code
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: HsnCodesRecord): HsnCodesSavePayload {
  return {
    code: record.code,
    description: record.description,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
