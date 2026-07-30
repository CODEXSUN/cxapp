import { useState, type ReactNode } from "react";
import { SaveIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import {
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormPanel
} from "@codexsun/ui/workspace/upsert";
import type {
  AccessPermissionSavePayload,
  AccessRoleSavePayload,
  AccessUserSavePayload
} from "./access-control.types";

export function AccessControlForm({
  onPermission,
  onRole,
  onUser,
  saving
}: {
  onPermission: (value: AccessPermissionSavePayload) => void;
  onRole: (value: AccessRoleSavePayload) => void;
  onUser: (value: AccessUserSavePayload) => void;
  saving: boolean;
}) {
  const [permission, setPermission] = useState<AccessPermissionSavePayload>({
    description: "",
    key: "",
    label: "",
    status: "active"
  });
  const [role, setRole] = useState<AccessRoleSavePayload>({
    description: "",
    key: "",
    label: "",
    permissionKeysText: "",
    status: "active"
  });
  const [user, setUser] = useState<AccessUserSavePayload>({
    email: "",
    name: "",
    roleKey: "super-admin",
    status: "active"
  });
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <MiniForm title="Permission" saving={saving} onSave={() => onPermission(permission)}>
        <Text
          label="Label"
          value={permission.label}
          onChange={(label) => setPermission((v) => ({ ...v, label }))}
        />
        <Text
          label="Key"
          value={permission.key}
          onChange={(key) => setPermission((v) => ({ ...v, key }))}
        />
        <Text
          label="Description"
          value={permission.description}
          onChange={(description) => setPermission((v) => ({ ...v, description }))}
        />
      </MiniForm>
      <MiniForm title="Role" saving={saving} onSave={() => onRole(role)}>
        <Text
          label="Label"
          value={role.label}
          onChange={(label) => setRole((v) => ({ ...v, label }))}
        />
        <Text label="Key" value={role.key} onChange={(key) => setRole((v) => ({ ...v, key }))} />
        <Text
          label="Permission keys"
          value={role.permissionKeysText}
          onChange={(permissionKeysText) => setRole((v) => ({ ...v, permissionKeysText }))}
        />
      </MiniForm>
      <MiniForm title="User" saving={saving} onSave={() => onUser(user)}>
        <Text
          label="Name"
          value={user.name}
          onChange={(name) => setUser((v) => ({ ...v, name }))}
        />
        <Text
          label="Email"
          value={user.email}
          onChange={(email) => setUser((v) => ({ ...v, email }))}
        />
        <WorkspaceFormField label="Status">
          <WorkspaceSelect
            value={user.status}
            options={["active", "inactive", "suspended"].map((value) => ({ label: value, value }))}
            onValueChange={(status) =>
              setUser((v) => ({ ...v, status: status as AccessUserSavePayload["status"] }))
            }
          />
        </WorkspaceFormField>
      </MiniForm>
    </div>
  );
}

function MiniForm({
  children,
  onSave,
  saving,
  title
}: {
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <WorkspaceFormPanel
      title={`New ${title}`}
      footer={
        <Button disabled={saving} onClick={onSave}>
          <SaveIcon className="size-4" />
          Save
        </Button>
      }
    >
      <WorkspaceFormGrid>{children}</WorkspaceFormGrid>
    </WorkspaceFormPanel>
  );
}

function Text({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <WorkspaceFormField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </WorkspaceFormField>
  );
}
