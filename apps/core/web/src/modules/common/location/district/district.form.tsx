import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { districtSchema } from "./district.schema";
import type { StateOption, DistrictRecord, DistrictSavePayload } from "./district.types";
const emptyValue: DistrictSavePayload = { stateId: 0, name: "", sortOrder: 1000, status: "active" };
export function DistrictForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  options,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: DistrictSavePayload) => void;
  open: boolean;
  options: StateOption[];
  record: DistrictRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the district details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} district`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initial={
          record
            ? {
                stateId: record.stateId,
                name: record.name,
                sortOrder: record.sortOrder,
                status: record.status
              }
            : emptyValue
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        options={options}
      />
    </WorkspaceUpsertDialog>
  );
}
function Body({
  error,
  initial,
  loading,
  onCancel,
  onSubmit,
  options
}: {
  error?: string;
  initial: DistrictSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: DistrictSavePayload) => void;
  options: StateOption[];
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = districtSchema.safeParse(value);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setValidation("");
        onSubmit(parsed.data);
      }}
    >
      {validation || error ? (
        <WorkspaceFormBanner title="Unable to save">{validation || error}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="District name" required>
          <Input
            autoFocus
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="State" required>
          <WorkspaceLookup
            allowTextValue={false}
            onValueChange={(id) => setValue((current) => ({ ...current, stateId: Number(id) }))}
            options={options
              .filter((item) => item.status === "active")
              .map((item) => ({ label: item.name, value: String(item.id) }))}
            placeholder="Select state"
            required
            value={value.stateId ? String(value.stateId) : ""}
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
          ariaLabel="District active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save district"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save district
            </>
          )
        }}
      />
    </form>
  );
}
