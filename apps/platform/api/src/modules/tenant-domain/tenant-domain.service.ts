import { TenantDomainRepository } from "./tenant-domain.repository.js";
import { TenantRepository } from "../tenant/tenant.repository.js";
import type { TenantDomainSavePayload } from "./tenant-domain.types.js";
import { tenantDomainVerificationName } from "./tenant-domain.repository.js";

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

  async updateDomain(uuid: string, input: TenantDomainSavePayload) {
    const tenant = await this.tenants.findByIdOrCode(String(input.tenantId));
    if (!tenant) return null;
    return this.domains.update(uuid, { ...input, tenantId: tenant.id });
  }

  async verifyDomain(uuid: string) {
    const domain = await this.domains.findByUuid(uuid);
    if (!domain) return null;
    let records: string[][];
    try {
      records = await resolveTxt(tenantDomainVerificationName(domain.domain));
    } catch {
      records = [];
    }
    const tokens = records
      .map((parts) => parts.join("").trim())
      .filter((value) => value.startsWith("cxapp-domain-verification="))
      .map((value) => value.slice("cxapp-domain-verification=".length));
    const verified = await this.domains.verify(uuid, tokens);
    if (!verified) {
      throw AppError.conflict(
        `Publish the supplied TXT value at ${tenantDomainVerificationName(domain.domain)}, then retry.`
      );
    }
    return verified;
  }
}
import { resolveTxt } from "node:dns/promises";
import { AppError } from "@cxapp/framework/errors";
