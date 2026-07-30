import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { TenantPermissionRepository } from "./tenant-permission.repository.js";
import type {
  TenantPermission,
  TenantPermissionContext,
  TenantPermissionListFilters,
  TenantPermissionSavePayload,
  TenantPermissionStatus
} from "./tenant-permission.types.js";
export class TenantPermissionService {
  private repository;
  constructor(private context: TenantPermissionContext) {
    this.repository = new TenantPermissionRepository(context.database);
  }
  async list(f: TenantPermissionListFilters = {}) {
    await this.context.authorize("platform.application.permission.view");
    return this.repository.list(f);
  }
  async get(id: string) {
    await this.context.authorize("platform.application.permission.view");
    return this.repository.find(id);
  }
  async create(v: TenantPermissionSavePayload) {
    await this.context.authorize("platform.application.permission.create");
    const r = await this.save(() =>
      this.repository.create(normalize(v), randomBytes(4).toString("hex"))
    );
    await this.audit("created", r);
    return r;
  }
  async update(id: string, v: TenantPermissionSavePayload) {
    await this.context.authorize("platform.application.permission.update");
    const c = await this.mutable(id);
    const r = (await this.save(() => this.repository.update(c.id, normalize(v))))!;
    await this.audit("updated", r);
    return r;
  }
  async setStatus(id: string, status: TenantPermissionStatus) {
    await this.context.authorize("platform.application.permission.suspend");
    const c = await this.mutable(id);
    const r = (await this.repository.setStatus(c.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", r);
    return r;
  }
  async forceDelete(id: string) {
    await this.context.authorize("platform.application.permission.delete");
    const c = await this.mutable(id),
      count = await this.repository.dependentCount(c.id);
    if (count)
      throw AppError.conflict(
        `Permission cannot be force deleted because ${count} role assignments reference it.`,
        { count }
      );
    const r = await this.delete(c.id);
    await this.audit("force-deleted", r);
    return r;
  }
  private async mutable(id: string): Promise<TenantPermission> {
    const r = await this.repository.find(id);
    if (!r) throw AppError.notFound("Permission was not found.");
    if (r.isProtected) throw AppError.forbidden("Protected permissions cannot be modified.");
    return r;
  }
  private audit(action: string, r: TenantPermission) {
    return recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "platform.tenant-permission",
      recordId: r.id,
      recordLabel: r.label,
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
        throw AppError.conflict("Permission key already exists.");
      throw e;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (e) {
      if (isReferenced(e))
        throw AppError.conflict(
          "Permission cannot be force deleted because role assignments reference it."
        );
      throw e;
    }
  }
}
function normalize(v: TenantPermissionSavePayload) {
  return {
    description: v.description.trim(),
    key: v.key.trim().toLowerCase(),
    label: v.label.trim(),
    status: v.status
  };
}

function isReferenced(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    (("code" in e && (e as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in e && (e as { errno?: unknown }).errno === 1451))
  );
}
