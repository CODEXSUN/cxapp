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
import { monthsSchema } from "./months.schema";
import type { MonthsRecord, MonthsSavePayload } from "./months.types";

const emptyMonths: MonthsSavePayload = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: true,
  sortOrder: 1000
};

export function MonthsForm({
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
  onSubmit: (payload: MonthsSavePayload) => void;
  open: boolean;
  record: MonthsRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the month details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} month`}
    >
      <MonthsFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyMonths}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function MonthsFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: MonthsSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: MonthsSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = monthsSchema.safeParse(value);
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
        <WorkspaceFormField label="Start date">
          <Input
            type="date"
            value={value.startDate}
            onChange={(event) =>
              setValue((current) => ({ ...current, startDate: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="End date">
          <Input
            type="date"
            value={value.endDate}
            onChange={(event) =>
              setValue((current) => ({ ...current, endDate: event.target.value }))
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
          ariaLabel="Month active status"
          checked={value.isActive}
          onCheckedChange={(checked) => setValue((current) => ({ ...current, isActive: checked }))}
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save month"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save month
            </>
          )
        }}
      />
    </form>
  );
}
function toPayload(record: MonthsRecord): MonthsSavePayload {
  return {
    name: record.name,
    startDate: record.startDate,
    endDate: record.endDate,
    isActive: record.isActive,
    sortOrder: record.sortOrder
  };
}
