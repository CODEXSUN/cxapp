import { toast } from "sonner";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { AccessControlForm } from "./access-control.form";
import { useAccessControlMutations, useAccessControlQuery } from "./access-control.hooks";
import { AccessControlList } from "./access-control.list";
import {
  accessPermissionSchema,
  accessRoleSchema,
  accessUserSchema
} from "./access-control.schema";
import type {
  AccessPermissionSavePayload,
  AccessRoleSavePayload,
  AccessUserSavePayload
} from "./access-control.types";

export function AccessControlWorkspace() {
  const query = useAccessControlQuery();
  const mutations = useAccessControlMutations();
  const saving =
    mutations.permission.isPending || mutations.role.isPending || mutations.user.isPending;
  const savePermission = (value: AccessPermissionSavePayload) =>
    accessPermissionSchema.safeParse(value).success
      ? mutations.permission.mutate(value)
      : toast.error("Permission validation failed");
  const saveRole = (value: AccessRoleSavePayload) =>
    accessRoleSchema.safeParse(value).success
      ? mutations.role.mutate(value)
      : toast.error("Role validation failed");
  const saveUser = (value: AccessUserSavePayload) =>
    accessUserSchema.safeParse(value).success
      ? mutations.user.mutate(value)
      : toast.error("User validation failed");
  return (
    <WorkspacePage
      title="Access Control"
      description="Manage platform permissions, roles, and platform users."
      technicalName="page.access-control"
    >
      <AccessControlForm
        saving={saving}
        onPermission={savePermission}
        onRole={saveRole}
        onUser={saveUser}
      />
      <AccessControlList data={query.data ?? { permissions: [], roles: [], users: [] }} />
    </WorkspacePage>
  );
}
