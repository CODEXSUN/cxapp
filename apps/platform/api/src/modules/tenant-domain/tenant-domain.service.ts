import { TenantDomainRepository } from "./tenant-domain.repository.js";
import { TenantRepository } from "../tenant/tenant.repository.js";
import type { TenantDomainSavePayload } from "./tenant-domain.types.js";

export class TenantDomainService {
  constructor(
    private readonly domains = new TenantDomainRepository(),
    private readonly tenants = new TenantRepository()
  ) {}

  listAllDomains() {
    return this.domains.listAll();
  }

  async listDomains(tenantIdOrUuid: string) {
    const tenant = await this.tenants.findByIdOrCode(tenantIdOrUuid);
    return tenant ? this.domains.listByTenantId(tenant.id) : [];
  }

  async updatePrimaryDomain(tenantIdOrUuid: string, domain: string) {
    const tenant = await this.tenants.findByIdOrCode(tenantIdOrUuid);
    if (!tenant) return null;

    const primaryDomain = await this.domains.upsertPrimaryDomain({
      domain,
      tenantId: tenant.id
    });

    return {
      ...tenant,
      primaryDomain
    };
  }

  async createDomain(input: TenantDomainSavePayload) {
    const tenant = await this.tenants.findByIdOrCode(String(input.tenantId));
    return tenant ? this.domains.create({ ...input, tenantId: tenant.id }) : null;
  }

  async updateDomain(id: string, input: TenantDomainSavePayload) {
    const tenant = await this.tenants.findByIdOrCode(String(input.tenantId));
    const domainId = Number.parseInt(id, 10);
    if (!tenant || !Number.isInteger(domainId)) return null;
    return this.domains.update(domainId, { ...input, tenantId: tenant.id });
  }
}
