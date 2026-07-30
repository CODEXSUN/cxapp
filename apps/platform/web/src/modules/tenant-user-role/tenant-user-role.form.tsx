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
import { tenantUserRoleSchema } from "./tenant-user-role.schema";
import type {
  TenantUserRole,
  TenantUserRoleRoleLookup,
  TenantUserRoleSavePayload,
  TenantUserRoleUserLookup
} from "./tenant-user-role.types";

const emptyAssignment: TenantUserRoleSavePayload = { roleId: 0, status: "active", userId: 0 };
export function TenantUserRoleForm({
  error,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  open,
  record,
  roles,
  users
}: {
  error?: string;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantUserRoleSavePayload) => void;
  open: boolean;
  record: TenantUserRole | null;
  roles: TenantUserRoleRoleLookup[];
  users: TenantUserRoleUserLookup[];
}) {
  return (
    <WorkspaceUpsertDialog
      description="Assign a role to a tenant user without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} user role`}
    >
      <TenantUserRoleFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? { roleId: record.roleId, status: record.status, userId: record.userId }
            : emptyAssignment
        }
        loading={loading}
        lookupLoading={lookupLoading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        roles={roles}
        users={users}
      />
    </WorkspaceUpsertDialog>
  );
}
function TenantUserRoleFormBody({
  error,
  initialValue,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  roles,
  users
}: {
  error?: string;
  initialValue: TenantUserRoleSavePayload;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantUserRoleSavePayload) => void;
  roles: TenantUserRoleRoleLookup[];
  users: TenantUserRoleUserLookup[];
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantUserRoleSchema.safeParse(value);
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
        <WorkspaceFormField label="User" required>
          <WorkspaceLookup
            allowTextValue={false}
            loading={lookupLoading}
            options={users
              .filter((item) => item.status === "active" || item.id === value.userId)
              .map((item) => ({
                description: item.email,
                label: item.name,
                value: String(item.id)
              }))}
            required
            value={value.userId ? String(value.userId) : ""}
            onValueChange={(id) => setValue((current) => ({ ...current, userId: Number(id) || 0 }))}
          />
        </WorkspaceFormField>
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
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="User role active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save user role"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save user role
            </>
          )
        }}
      />
    </form>
  );
}
