import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import { env } from "../../env.js";
import type {
  TenantDomain,
  TenantDomainRecord,
  TenantDomainSavePayload
} from "./tenant-domain.types.js";

export class TenantDomainRepository {
  async listAll() {
    const rows = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .innerJoin("tenants", "tenants.id", "tenant_domains.tenant_id")
      .select([
        "tenant_domains.id",
        "tenant_domains.uuid",
        "tenant_domains.tenant_id",
        "tenant_domains.domain",
        "tenant_domains.is_primary",
        "tenants.tenant_code",
        "tenants.tenant_name",
        "tenants.status as tenant_status"
      ])
      .orderBy("tenant_domains.domain", "asc")
      .execute();

    return rows.map((row): TenantDomainRecord => ({
      domain: row.domain,
      id: Number(row.id),
      isPrimary: Boolean(row.is_primary),
      tenantCode: row.tenant_code,
      tenantId: Number(row.tenant_id),
      tenantName: row.tenant_name,
      tenantStatus: row.tenant_status,
      uuid: row.uuid
    }));
  }

  async listByTenantId(tenantId: number) {
    const rows = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select(["id", "uuid", "tenant_id", "domain", "is_primary"])
      .where("tenant_id", "=", tenantId)
      .orderBy("is_primary", "desc")
      .orderBy("domain", "asc")
      .execute();

    return rows.map((row): TenantDomain => ({
      domain: row.domain,
      id: Number(row.id),
      isPrimary: Boolean(row.is_primary),
      tenantId: Number(row.tenant_id),
      uuid: row.uuid
    }));
  }

  async findTenantIdByDomain(value: string) {
    const domain = normalizeTenantDomain(value);
    if (!domain) return null;

    const row = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select(["tenant_id"])
      .where("domain", "=", domain)
      .executeTakeFirst();

    return row ? Number(row.tenant_id) : null;
  }

  async primaryDomainForTenant(tenantId: number, fallbackSlug: string) {
    const row = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select(["domain"])
      .where("tenant_id", "=", tenantId)
      .where("is_primary", "=", true)
      .executeTakeFirst();

    return normalizeTenantDomain(row?.domain ?? defaultTenantDomainForSlug(fallbackSlug));
  }

  async upsertPrimaryDomain(input: { domain: string; tenantId: number }) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain) return "";

    await getPlatformDatabase()
      .transaction()
      .execute(async (database) => {
        await database
          .updateTable("tenant_domains")
          .set({ is_primary: false })
          .where("tenant_id", "=", input.tenantId)
          .execute();

        await database
          .insertInto("tenant_domains")
          .values({
            domain,
            is_primary: true,
            tenant_id: input.tenantId,
            uuid: createPublicUuid()
          })
          .onDuplicateKeyUpdate({
            is_primary: true,
            tenant_id: input.tenantId
          })
          .execute();
      });

    return domain;
  }

  async create(input: TenantDomainSavePayload) {
    await this.upsertPrimaryDomain(input);
    return this.findByTenantIdAndDomain(input.tenantId, input.domain);
  }

  async update(id: number, input: TenantDomainSavePayload) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain) return null;

    await getPlatformDatabase()
      .transaction()
      .execute(async (database) => {
        await database
          .updateTable("tenant_domains")
          .set({ is_primary: false })
          .where("tenant_id", "=", input.tenantId)
          .execute();
        await database
          .updateTable("tenant_domains")
          .set({
            domain,
            is_primary: true,
            tenant_id: input.tenantId
          })
          .where("id", "=", id)
          .execute();
      });

    return this.findById(id);
  }

  private async findById(id: number) {
    return (await this.listAll()).find((domain) => domain.id === id) ?? null;
  }

  private async findByTenantIdAndDomain(tenantId: number, value: string) {
    const domain = normalizeTenantDomain(value);
    return (
      (await this.listAll()).find((item) => item.tenantId === tenantId && item.domain === domain) ??
      null
    );
  }
}

export function defaultTenantDomainForSlug(slug: string) {
  const baseDomain = normalizeTenantDomain(env.TENANT_DOMAIN_BASE || "localhost");
  return normalizeTenantDomain(
    baseDomain === "localhost" ? `${slug}.localhost` : `${slug}.${baseDomain}`
  );
}

export function normalizeTenantDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function createPublicUuid() {
  return randomBytes(4).toString("hex");
}
