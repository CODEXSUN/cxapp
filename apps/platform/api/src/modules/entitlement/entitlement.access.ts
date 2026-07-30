import { TenantRepository } from "../tenant/tenant.repository.js";
import { resolveLandingApp } from "../app-registry/index.js";
import { EntitlementRepository } from "./entitlement.repository.js";
import {
  getDefaultCompanyForDatabase,
  setDefaultCompanyLandingAppForDatabase
} from "@codexsun/core-api";

export class EntitlementAccessService {
  constructor(
    private readonly entitlements = new EntitlementRepository(),
    private readonly tenants = new TenantRepository()
  ) {}

  async refreshTenantAccess(tenantId: number) {
    const tenant = await this.tenants.findByIdOrCode(String(tenantId));
    if (!tenant) return null;
    const moduleKeys = await this.entitlements.resolveTenantModuleKeys(tenant.id);
    const defaultCompany = await getDefaultCompanyForDatabase(tenant.dbName).catch(() => null);
    const defaultLandingApp = resolveLandingApp(defaultCompany?.landingApp, [
      ...tenant.enabledModuleKeys,
      ...moduleKeys
    ]);
    const updated = await this.tenants.updateAccess(tenant, moduleKeys, defaultLandingApp);
    if (defaultCompany && defaultCompany.landingApp !== defaultLandingApp) {
      await setDefaultCompanyLandingAppForDatabase(tenant.dbName, defaultLandingApp);
    }
    return updated;
  }

  async refreshTenantsForPlan(planId: number) {
    const tenantIds = await this.entitlements.tenantIdsForPlan(planId);
    return Promise.all(tenantIds.map((tenantId) => this.refreshTenantAccess(tenantId)));
  }
}
