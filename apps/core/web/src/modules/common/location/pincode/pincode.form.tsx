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
import { pincodeSchema } from "./pincode.schema";
import type { CityOption, PincodeRecord, PincodeSavePayload } from "./pincode.types";
const emptyValue: PincodeSavePayload = {
  area: "",
  cityId: 0,
  name: "",
  sortOrder: 1000,
  status: "active"
};
export function PincodeForm({
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
  onSubmit: (value: PincodeSavePayload) => void;
  open: boolean;
  options: CityOption[];
  record: PincodeRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the pincode details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} pincode`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initial={
          record
            ? {
                cityId: record.cityId,
                name: record.name,
                area: record.area,
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
  initial: PincodeSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: PincodeSavePayload) => void;
  options: CityOption[];
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = pincodeSchema.safeParse(value);
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
        <WorkspaceFormField label="Postal code" required>
          <Input
            autoFocus
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Area" required>
          <Input
            required
            value={value.area}
            onChange={(event) => setValue((current) => ({ ...current, area: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="City" required>
          <WorkspaceLookup
            allowTextValue={false}
            onValueChange={(id) => setValue((current) => ({ ...current, cityId: Number(id) }))}
            options={options
              .filter((item) => item.status === "active")
              .map((item) => ({ label: item.name, value: String(item.id) }))}
            placeholder="Select city"
            required
            value={value.cityId ? String(value.cityId) : ""}
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
          ariaLabel="Pincode active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save pincode"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save pincode
            </>
          )
        }}
      />
    </form>
  );
}
