import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { TenantRolePermissionRepository } from "./tenant-role-permission.repository.js";
import type {
  TenantRolePermission,
  TenantRolePermissionContext,
  TenantRolePermissionListFilters,
  TenantRolePermissionSavePayload,
  TenantRolePermissionStatus
} from "./tenant-role-permission.types.js";
export class TenantRolePermissionService {
  private repository;
  constructor(private context: TenantRolePermissionContext) {
    this.repository = new TenantRolePermissionRepository(context.database);
  }
  async list(f: TenantRolePermissionListFilters = {}) {
    await this.context.authorize("platform.application.role-permission.view");
    return this.repository.list(f);
  }
  async get(id: string) {
    await this.context.authorize("platform.application.role-permission.view");
    return this.repository.find(id);
  }
  async create(v: TenantRolePermissionSavePayload) {
    await this.context.authorize("platform.application.role-permission.assign");
    await this.validate(v);
    const r = await this.save(() => this.repository.create(v, randomBytes(4).toString("hex")));
    await this.audit("assigned", r);
    return r;
  }
  async update(id: string, v: TenantRolePermissionSavePayload) {
    await this.context.authorize("platform.application.role-permission.update");
    const c = await this.mutable(id);
    await this.validate(v);
    const r = (await this.save(() => this.repository.update(c.id, v)))!;
    await this.audit("updated", r);
    return r;
  }
  async setStatus(id: string, status: TenantRolePermissionStatus) {
    await this.context.authorize("platform.application.role-permission.update");
    const c = await this.mutable(id);
    const r = (await this.repository.setStatus(c.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", r);
    return r;
  }
  async forceDelete(id: string) {
    await this.context.authorize("platform.application.role-permission.remove");
    const c = await this.mutable(id),
      r = await this.delete(c.id);
    await this.audit("removed", r);
    return r;
  }
  private async validate(v: TenantRolePermissionSavePayload) {
    const p = await this.repository.parents(v);
    if (!p.role) throw AppError.validation("Active role was not found.");
    if (!p.permission) throw AppError.validation("Active permission was not found.");
  }
  private async mutable(id: string): Promise<TenantRolePermission> {
    const r = await this.repository.find(id);
    if (!r) throw AppError.notFound("Role-permission assignment was not found.");
    if (r.isProtected)
      throw AppError.forbidden("Protected role-permission assignments cannot be modified.");
    return r;
  }
  private audit(action: string, r: TenantRolePermission) {
    return recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "platform.tenant-role-permission",
      recordId: r.id,
      recordLabel: `${r.roleLabel} · ${r.permissionLabel}`,
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
        throw AppError.conflict("This role already has the selected permission.");
      throw e;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (e) {
      if (isReferenced(e))
        throw AppError.conflict(
          "Role-permission assignment cannot be removed because related records reference it."
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
