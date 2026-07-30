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
import { prioritiesSchema } from "./priorities.schema";
import type { PrioritiesRecord, PrioritiesSavePayload } from "./priorities.types";

const emptyPriorities: PrioritiesSavePayload = {
  name: "",
  colour: "",
  tag: "",
  isActive: true,
  sortOrder: 1000
};

export function PrioritiesForm({
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
  onSubmit: (payload: PrioritiesSavePayload) => void;
  open: boolean;
  record: PrioritiesRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the priority details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} priority`}
    >
      <PrioritiesFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyPriorities}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function PrioritiesFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: PrioritiesSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: PrioritiesSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = prioritiesSchema.safeParse(value);
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
        <WorkspaceFormField label="Colour">
          <Input
            type="color"
            value={value.colour}
            onChange={(event) =>
              setValue((current) => ({ ...current, colour: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Tag">
          <Input
            type="text"
            value={value.tag}
            onChange={(event) => setValue((current) => ({ ...current, tag: event.target.value }))}
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
          ariaLabel="Priority active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save priority"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save priority
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: PrioritiesRecord): PrioritiesSavePayload {
  return {
    name: record.name,
    colour: record.colour,
    tag: record.tag,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
