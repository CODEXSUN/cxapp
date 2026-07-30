import { useState } from "react";
import { Save } from "lucide-react";
import {
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceLookup,
  WorkspaceSelect,
  WorkspaceSwitchCard,
  WorkspaceUpsertDialog
} from "@codexsun/ui";
import { WorkspaceFormBanner } from "@codexsun/ui/workspace/upsert";
import { defaultCompanySchema } from "./default-company.schema";
import type {
  DefaultCompanyLookup,
  DefaultCompanyRecord,
  DefaultCompanySavePayload,
  LandingAppOption
} from "./default-company.types";
export function DefaultCompanyForm({
  companies,
  error,
  financialYears,
  landingApps,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  companies: DefaultCompanyLookup[];
  error?: string | undefined;
  financialYears: DefaultCompanyLookup[];
  landingApps: LandingAppOption[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: DefaultCompanySavePayload) => void;
  open: boolean;
  record: DefaultCompanyRecord | null;
}) {
  const initial: DefaultCompanySavePayload = {
    companyId: record?.companyId ?? 0,
    financialYearId: record?.financialYearId ?? 0,
    landingApp: record?.landingApp ?? landingApps[0]?.value ?? "application",
    status: record?.status ?? "active"
  };
  return (
    <WorkspaceUpsertDialog
      description="This singleton controls the startup company, accounting year, and landing app for the tenant."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} default company`}
    >
      <Body
        key={`${record?.id ?? "new"}:${open}`}
        companies={companies}
        error={error}
        financialYears={financialYears}
        initial={initial}
        landingApps={landingApps}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function Body({
  companies,
  error,
  financialYears,
  initial,
  landingApps,
  loading,
  onCancel,
  onSubmit
}: {
  companies: DefaultCompanyLookup[];
  error?: string | undefined;
  financialYears: DefaultCompanyLookup[];
  initial: DefaultCompanySavePayload;
  landingApps: LandingAppOption[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: DefaultCompanySavePayload) => void;
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  const shown = validation || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = defaultCompanySchema.safeParse(value);
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
        <WorkspaceFormField label="Company" required>
          <WorkspaceLookup
            allowTextValue={false}
            options={companies.map((item) => ({
              value: String(item.id),
              label: item.label,
              ...(item.code ? { description: item.code } : {})
            }))}
            placeholder="Search company"
            value={value.companyId ? String(value.companyId) : ""}
            onValueChange={(id) =>
              setValue((current) => ({ ...current, companyId: Number(id) || 0 }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Financial year" required>
          <WorkspaceLookup
            allowTextValue={false}
            options={financialYears.map((item) => ({ value: String(item.id), label: item.label }))}
            placeholder="Search financial year"
            value={value.financialYearId ? String(value.financialYearId) : ""}
            onValueChange={(id) =>
              setValue((current) => ({ ...current, financialYearId: Number(id) || 0 }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Landing app" required>
          <WorkspaceSelect
            options={landingApps}
            value={value.landingApp}
            onValueChange={(landingApp) => setValue((current) => ({ ...current, landingApp }))}
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          ariaLabel="Default company active status"
          checked={value.status === "active"}
          fieldLabel="Status"
          onCheckedChange={(active) =>
            setValue((current) => ({ ...current, status: active ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save default company"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save
            </>
          )
        }}
      />
    </form>
  );
}
