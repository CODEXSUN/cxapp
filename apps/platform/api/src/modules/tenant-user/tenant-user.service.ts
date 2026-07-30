import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { hashPassword } from "../../auth/password-hash.js";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { TenantUserRepository } from "./tenant-user.repository.js";
import type {
  TenantUser,
  TenantUserContext,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserStatus
} from "./tenant-user.types.js";

export class TenantUserService {
  private readonly repository: TenantUserRepository;
  constructor(private readonly context: TenantUserContext) {
    this.repository = new TenantUserRepository(context.database);
  }
  async list(filters: TenantUserListFilters = {}) {
    await this.context.authorize("platform.application.user.view");
    return this.repository.list(filters);
  }
  async get(id: string) {
    await this.context.authorize("platform.application.user.view");
    return this.repository.find(id);
  }
  async create(input: TenantUserSavePayload) {
    await this.context.authorize("platform.application.user.create");
    const value = normalize(input, true);
    const record = await this.save(() =>
      this.repository.create(value, randomBytes(4).toString("hex"), hashPassword(value.password!))
    );
    await this.audit("created", record);
    return record;
  }
  async update(id: string, input: TenantUserSavePayload) {
    await this.context.authorize("platform.application.user.update");
    const current = await this.mutable(id);
    const value = normalize(input, false);
    const record = (await this.save(() =>
      this.repository.update(
        current.id,
        value,
        value.password ? hashPassword(value.password) : undefined
      )
    ))!;
    await this.audit("updated", record);
    return record;
  }
  async setStatus(id: string, status: TenantUserStatus) {
    await this.context.authorize("platform.application.user.suspend");
    const current = await this.mutable(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }
  async forceDelete(id: string) {
    await this.context.authorize("platform.application.user.delete");
    const current = await this.mutable(id);
    const count = await this.repository.dependentCount(current.id);
    if (count)
      throw AppError.conflict(
        `User cannot be force deleted because ${count} role assignments reference it.`,
        { count }
      );
    const record = await this.delete(current.id);
    await this.audit("force-deleted", record);
    return record;
  }
  private async mutable(id: string): Promise<TenantUser> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("User was not found.");
    if (record.isProtected) throw AppError.forbidden("Protected users cannot be modified.");
    return record;
  }
  private async audit(action: string, record: TenantUser) {
    await recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "platform.tenant-user",
      recordId: record.id,
      recordLabel: record.name,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("User email already exists.");
      throw error;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (error) {
      if (isReferenced(error)) {
        throw AppError.conflict(
          "User cannot be force deleted because business or audit records reference it."
        );
      }
      throw error;
    }
  }
}
function normalize(input: TenantUserSavePayload, creating: boolean): TenantUserSavePayload {
  const password = input.password?.trim();
  if (creating && (!password || password.length < 8))
    throw AppError.validation("Password must contain at least 8 characters.");
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    ...(password ? { password } : {}),
    status: input.status
  };
}
function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}

function isReferenced(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (("code" in error && (error as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in error && (error as { errno?: unknown }).errno === 1451))
  );
}
