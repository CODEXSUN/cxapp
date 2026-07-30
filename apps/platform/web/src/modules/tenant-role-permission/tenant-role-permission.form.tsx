import { useState } from "react";
import { Save } from "lucide-react";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { tenantRolePermissionSchema } from "./tenant-role-permission.schema";
import type {
  TenantRolePermission,
  TenantRolePermissionPermissionLookup,
  TenantRolePermissionRoleLookup,
  TenantRolePermissionSavePayload
} from "./tenant-role-permission.types";

const emptyAssignment: TenantRolePermissionSavePayload = {
  permissionId: 0,
  roleId: 0,
  status: "active"
};
export function TenantRolePermissionForm({
  error,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  open,
  permissions,
  record,
  roles
}: {
  error?: string;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantRolePermissionSavePayload) => void;
  open: boolean;
  permissions: TenantRolePermissionPermissionLookup[];
  record: TenantRolePermission | null;
  roles: TenantRolePermissionRoleLookup[];
}) {
  return (
    <WorkspaceUpsertDialog
      description="Grant a permission to a tenant role without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} role permission`}
    >
      <TenantRolePermissionFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? { permissionId: record.permissionId, roleId: record.roleId, status: record.status }
            : emptyAssignment
        }
        loading={loading}
        lookupLoading={lookupLoading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        permissions={permissions}
        roles={roles}
      />
    </WorkspaceUpsertDialog>
  );
}
function TenantRolePermissionFormBody({
  error,
  initialValue,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  permissions,
  roles
}: {
  error?: string;
  initialValue: TenantRolePermissionSavePayload;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantRolePermissionSavePayload) => void;
  permissions: TenantRolePermissionPermissionLookup[];
  roles: TenantRolePermissionRoleLookup[];
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantRolePermissionSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the assignment.");
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
        <WorkspaceFormField label="Role" required>
          <WorkspaceLookup
            allowTextValue={false}
            loading={lookupLoading}
            options={roles
              .filter((item) => item.status === "active" || item.id === value.roleId)
              .map((item) => ({
                description: item.key,
                label: item.label,
                value: String(item.id)
              }))}
            required
            value={value.roleId ? String(value.roleId) : ""}
            onValueChange={(id) => setValue((current) => ({ ...current, roleId: Number(id) || 0 }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Permission" required>
          <WorkspaceLookup
            allowTextValue={false}
            loading={lookupLoading}
            options={permissions
              .filter((item) => item.status === "active" || item.id === value.permissionId)
              .map((item) => ({
                description: item.key,
                label: item.label,
                value: String(item.id)
              }))}
            required
            value={value.permissionId ? String(value.permissionId) : ""}
            onValueChange={(id) =>
              setValue((current) => ({ ...current, permissionId: Number(id) || 0 }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Role permission active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save role permission"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save role permission
            </>
          )
        }}
      />
    </form>
  );
}
