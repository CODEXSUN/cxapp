import { AccessControlRepository } from "./access-control.repository.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import type {
  AccessPermissionSavePayload,
  AccessRoleSavePayload,
  AccessUserSavePayload
} from "./access-control.types.js";

export class AccessControlService {
  constructor(
    private readonly repository = new AccessControlRepository(),
    private readonly activity = new PlatformActivityService()
  ) {}
  overview() {
    return this.repository.overview();
  }
  async savePermission(input: AccessPermissionSavePayload) {
    validateKey(input.key);
    const permission = await this.repository.savePermission({
      ...input,
      key: normalizeKey(input.key)
    });
    await this.activity.recordActivity({
      action: "permission.saved",
      details: input,
      moduleKey: "platform.access-control",
      recordId: permission?.id ?? null,
      recordLabel: input.label,
      recordUuid: permission?.uuid ?? null
    });
    return permission;
  }
  async saveRole(input: AccessRoleSavePayload) {
    validateKey(input.key);
    const role = await this.repository.saveRole({ ...input, key: normalizeKey(input.key) });
    await this.activity.recordActivity({
      action: "role.saved",
      details: input,
      moduleKey: "platform.access-control",
      recordId: role?.id ?? null,
      recordLabel: input.label,
      recordUuid: role?.uuid ?? null
    });
    return role;
  }
  async saveUser(input: AccessUserSavePayload) {
    if (!input.email.includes("@")) throw new Error("Valid email is required.");
    const user = await this.repository.saveUser(input);
    await this.activity.recordActivity({
      action: "user.saved",
      details: { email: input.email, roleKey: input.roleKey, status: input.status },
      moduleKey: "platform.access-control",
      recordId: user?.id ?? null,
      recordLabel: input.email,
      recordUuid: user?.uuid ?? null
    });
    return user;
  }
}

export function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, ".");
}

function validateKey(value: string) {
  if (!normalizeKey(value)) throw new Error("Access key is required.");
}
