import { TenantRepository } from "../tenant/tenant.repository.js";
import { resolveLandingApp } from "../app-registry/index.js";
import { EntitlementRepository } from "./entitlement.repository.js";

export class EntitlementAccessService {
  constructor(
    private readonly entitlements = new EntitlementRepository(),
    private readonly tenants = new TenantRepository()
  ) {}

  async refreshTenantAccess(tenantId: number) {
    const tenant = await this.tenants.findByIdOrCode(String(tenantId));
    if (!tenant) return null;
    const moduleKeys = await this.entitlements.resolveTenantModuleKeys(tenant.id);
    const defaultLandingApp = resolveLandingApp(tenant.defaultLandingApp, [
      ...tenant.enabledModuleKeys,
      ...moduleKeys
    ]);
    return this.tenants.updateAccess(tenant, moduleKeys, defaultLandingApp);
  }

  async refreshTenantsForPlan(planId: number) {
    const tenantIds = await this.entitlements.tenantIdsForPlan(planId);
    return Promise.all(tenantIds.map((tenantId) => this.refreshTenantAccess(tenantId)));
  }
}
