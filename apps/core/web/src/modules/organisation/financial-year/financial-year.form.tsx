import { useState } from "react";
import { Save } from "lucide-react";
import {
  Input,
  WorkspaceDatePicker,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceSwitchCard,
  WorkspaceUpsertDialog
} from "@codexsun/ui";
import { WorkspaceFormBanner } from "@codexsun/ui/workspace/upsert";
import { financialYearSchema } from "./financial-year.schema";
import type { FinancialYearRecord, FinancialYearSavePayload } from "./financial-year.types";
const empty: FinancialYearSavePayload = {
  name: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  status: "active"
};
export function FinancialYearForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string | undefined;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: FinancialYearSavePayload) => void;
  open: boolean;
  record: FinancialYearRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Define the dates used to scope accounting and transaction workflows."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} financial year`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        error={error}
        initial={
          record
            ? {
                name: record.name,
                startDate: record.startDate,
                endDate: record.endDate,
                isCurrent: record.isCurrent,
                status: record.status
              }
            : empty
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function Body({
  error,
  initial,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string | undefined;
  initial: FinancialYearSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: FinancialYearSavePayload) => void;
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  const shown = validation || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = financialYearSchema.safeParse(value);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setValidation("");
        onSubmit(parsed.data);
      }}
    >
      {shown ? <WorkspaceFormBanner title="Unable to save">{shown}</WorkspaceFormBanner> : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Name" required>
          <Input
            autoFocus
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <div />
        <WorkspaceFormField label="Start date" required>
          <WorkspaceDatePicker
            value={value.startDate}
            onValueChange={(startDate) => setValue((current) => ({ ...current, startDate }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="End date" required>
          <WorkspaceDatePicker
            value={value.endDate}
            onValueChange={(endDate) => setValue((current) => ({ ...current, endDate }))}
          />
        </WorkspaceFormField>
        <StatusRow
          label="Current year"
          checked={value.isCurrent}
          onChange={(isCurrent) => setValue((current) => ({ ...current, isCurrent }))}
        />
        <StatusRow
          label="Active"
          checked={value.status === "active"}
          onChange={(active) =>
            setValue((current) => ({ ...current, status: active ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel={recordLabel(initial)}
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save financial year
            </>
          )
        }}
      />
    </form>
  );
}
function StatusRow({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return <WorkspaceSwitchCard checked={checked} label={label} onCheckedChange={onChange} />;
}
function recordLabel(_value: FinancialYearSavePayload) {
  return "Save financial year";
}
