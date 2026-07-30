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
import { stateSchema } from "./state.schema";
import type { CountryOption, StateRecord, StateSavePayload } from "./state.types";

const emptyState: StateSavePayload = {
  countryId: 0,
  code: "",
  name: "",
  sortOrder: 1000,
  status: "active"
};

export function StateForm({
  countries,
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  countries: CountryOption[];
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: StateSavePayload) => void;
  open: boolean;
  record: StateRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the state details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} state`}
    >
      <StateFormBody
        key={`${record?.id ?? "new"}:${open}`}
        countries={countries}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyState}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function StateFormBody({
  countries,
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  countries: CountryOption[];
  error?: string;
  initialValue: StateSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: StateSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = stateSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the state details.");
          return;
        }
        setValidationError("");
        onSubmit(parsed.data);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="State name" required>
          <Input
            autoFocus
            maxLength={200}
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="State code" required>
          <Input
            className="font-mono uppercase"
            maxLength={80}
            required
            value={value.code}
            onChange={(event) =>
              setValue((current) => ({ ...current, code: event.target.value.toUpperCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Country" required>
          <WorkspaceLookup
            allowTextValue={false}
            onValueChange={(countryId) =>
              setValue((current) => ({ ...current, countryId: Number(countryId) }))
            }
            options={countries
              .filter((country) => country.status === "active")
              .map((country) => ({
                label: `${country.name} (${country.code})`,
                value: String(country.id)
              }))}
            placeholder="Select country"
            required
            value={value.countryId ? String(value.countryId) : ""}
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
          ariaLabel="State active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save state"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save state
            </>
          )
        }}
      />
    </form>
  );
}

function toPayload(record: StateRecord): StateSavePayload {
  return {
    countryId: record.countryId,
    code: record.code,
    name: record.name,
    sortOrder: record.sortOrder,
    status: record.status
  };
}
