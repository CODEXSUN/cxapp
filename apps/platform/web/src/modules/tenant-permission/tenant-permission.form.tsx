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
import { tenantPermissionSchema } from "./tenant-permission.schema";
import type { TenantPermission, TenantPermissionSavePayload } from "./tenant-permission.types";

const emptyPermission: TenantPermissionSavePayload = {
  description: "",
  key: "",
  label: "",
  status: "active"
};
export function TenantPermissionForm({
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
  onSubmit: (value: TenantPermissionSavePayload) => void;
  open: boolean;
  record: TenantPermission | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the permission details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} permission`}
    >
      <TenantPermissionFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? {
                description: record.description,
                key: record.key,
                label: record.label,
                status: record.status
              }
            : emptyPermission
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function TenantPermissionFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: TenantPermissionSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantPermissionSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantPermissionSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the permission details.");
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
        <WorkspaceFormField label="Permission name" required>
          <Input
            autoFocus
            maxLength={160}
            required
            value={value.label}
            onChange={(event) => setValue((current) => ({ ...current, label: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Permission key" required>
          <Input
            className="font-mono lowercase"
            maxLength={160}
            required
            value={value.key}
            onChange={(event) =>
              setValue((current) => ({ ...current, key: event.target.value.toLowerCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Description">
          <Input
            maxLength={500}
            value={value.description}
            onChange={(event) =>
              setValue((current) => ({ ...current, description: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Permission active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save permission"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save permission
            </>
          )
        }}
      />
    </form>
  );
}
