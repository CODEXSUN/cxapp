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
import { tenantUserSchema } from "./tenant-user.schema";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";

const emptyUser: TenantUserSavePayload = { email: "", name: "", password: "", status: "active" };

export function TenantUserForm({
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
  onSubmit: (value: TenantUserSavePayload) => void;
  open: boolean;
  record: TenantUser | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the user details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} user`}
    >
      <TenantUserFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? { email: record.email, name: record.name, password: "", status: record.status }
            : emptyUser
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        record={record}
      />
    </WorkspaceUpsertDialog>
  );
}

function TenantUserFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit,
  record
}: {
  error?: string;
  initialValue: TenantUserSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantUserSavePayload) => void;
  record: TenantUser | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantUserSchema.safeParse(value);
        if (!parsed.success || (!record && !value.password)) {
          setValidationError(
            !record && !value.password
              ? "Password must contain at least 8 characters."
              : (parsed.error?.issues[0]?.message ?? "Check the user details.")
          );
          return;
        }
        setValidationError("");
        const { password, ...payload } = parsed.data;
        onSubmit(password ? { ...payload, password } : payload);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="User name" required>
          <Input
            autoFocus
            maxLength={180}
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Email" required>
          <Input
            maxLength={180}
            required
            type="email"
            value={value.email}
            onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label={record ? "New password" : "Password"} required={!record}>
          <Input
            minLength={8}
            required={!record}
            type="password"
            value={value.password ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, password: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="User active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save user"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save user
            </>
          )
        }}
      />
    </form>
  );
}
