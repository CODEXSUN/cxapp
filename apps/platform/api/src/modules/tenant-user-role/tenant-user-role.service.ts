import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { TenantUserRoleRepository } from "./tenant-user-role.repository.js";
import type {
  TenantUserRole,
  TenantUserRoleContext,
  TenantUserRoleListFilters,
  TenantUserRoleSavePayload,
  TenantUserRoleStatus
} from "./tenant-user-role.types.js";
export class TenantUserRoleService {
  private repository;
  constructor(private context: TenantUserRoleContext) {
    this.repository = new TenantUserRoleRepository(context.database);
  }
  async list(f: TenantUserRoleListFilters = {}) {
    await this.context.authorize("platform.application.user-role.view");
    return this.repository.list(f);
  }
  async get(id: string) {
    await this.context.authorize("platform.application.user-role.view");
    return this.repository.find(id);
  }
  async create(v: TenantUserRoleSavePayload) {
    await this.context.authorize("platform.application.user-role.assign");
    await this.validate(v);
    const r = await this.save(() => this.repository.create(v, randomBytes(4).toString("hex")));
    await this.audit("assigned", r);
    return r;
  }
  async update(id: string, v: TenantUserRoleSavePayload) {
    await this.context.authorize("platform.application.user-role.update");
    const c = await this.mutable(id);
    await this.validate(v);
    const r = (await this.save(() => this.repository.update(c.id, v)))!;
    await this.audit("updated", r);
    return r;
  }
  async setStatus(id: string, status: TenantUserRoleStatus) {
    await this.context.authorize("platform.application.user-role.update");
    const c = await this.mutable(id);
    const r = (await this.repository.setStatus(c.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", r);
    return r;
  }
  async forceDelete(id: string) {
    await this.context.authorize("platform.application.user-role.remove");
    const c = await this.mutable(id),
      r = await this.delete(c.id);
    await this.audit("removed", r);
    return r;
  }
  private async validate(v: TenantUserRoleSavePayload) {
    const p = await this.repository.parents(v);
    if (!p.user) throw AppError.validation("Active user was not found.");
    if (!p.role) throw AppError.validation("Active role was not found.");
  }
  private async mutable(id: string): Promise<TenantUserRole> {
    const r = await this.repository.find(id);
    if (!r) throw AppError.notFound("User-role assignment was not found.");
    if (r.isProtected)
      throw AppError.forbidden("Protected user-role assignments cannot be modified.");
    return r;
  }
  private audit(action: string, r: TenantUserRole) {
    return recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "platform.tenant-user-role",
      recordId: r.id,
      recordLabel: `${r.userName} · ${r.roleLabel}`,
      recordUuid: r.uuid,
      tenantId: this.context.tenantId
    });
  }
  private async save<T>(f: () => Promise<T>) {
    try {
      return await f();
    } catch (e) {
      if (
        typeof e === "object" &&
        e &&
        "code" in e &&
        (e as { code?: unknown }).code === "ER_DUP_ENTRY"
      )
        throw AppError.conflict("This user already has the selected role.");
      throw e;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (e) {
      if (isReferenced(e))
        throw AppError.conflict(
          "User-role assignment cannot be removed because related records reference it."
        );
      throw e;
    }
  }
}

function isReferenced(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    (("code" in e && (e as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in e && (e as { errno?: unknown }).errno === 1451))
  );
}
