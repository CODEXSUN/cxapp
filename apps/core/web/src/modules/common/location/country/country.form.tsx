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
import { countrySchema } from "./country.schema";
import type { CountryRecord, CountrySavePayload } from "./country.types";

const emptyCountry: CountrySavePayload = {
  code: "",
  name: "",
  sortOrder: 1000,
  status: "active"
};

export function CountryForm({
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
  onSubmit: (payload: CountrySavePayload) => void;
  open: boolean;
  record: CountryRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the country details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} country`}
    >
      <CountryFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyCountry}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function CountryFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: CountrySavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: CountrySavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = countrySchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the country details.");
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
        <WorkspaceFormField label="Country name" required>
          <Input
            autoFocus
            maxLength={200}
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Country code" required>
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
          ariaLabel="Country active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save country"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save country
            </>
          )
        }}
      />
    </form>
  );
}

function toPayload(record: CountryRecord): CountrySavePayload {
  return {
    code: record.code,
    name: record.name,
    sortOrder: record.sortOrder,
    status: record.status
  };
}
