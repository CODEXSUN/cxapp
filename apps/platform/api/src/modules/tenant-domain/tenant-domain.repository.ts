import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { getPlatformDatabase } from "../../database/platform-database.js";
import { env } from "../../env.js";
import type { TenantDomainRecord, TenantDomainSavePayload } from "./tenant-domain.types.js";

export class TenantDomainRepository {
  async listAll() {
    const rows = await getPlatformDatabase()
      .selectFrom("app_tenant_domains")
      .innerJoin("app_tenants", "app_tenants.id", "app_tenant_domains.tenant_id")
      .select([
        "app_tenant_domains.id",
        "app_tenant_domains.uuid",
        "app_tenant_domains.tenant_id",
        "app_tenant_domains.domain",
        "app_tenant_domains.is_primary",
        "app_tenant_domains.status",
        "app_tenant_domains.verification_status",
        "app_tenant_domains.verified_at",
        "app_tenants.tenant_code",
        "app_tenants.tenant_name",
        "app_tenants.status as tenant_status"
      ])
      .orderBy("app_tenant_domains.domain", "asc")
      .execute();
    return rows.map((row): TenantDomainRecord => ({
      domain: row.domain,
      id: Number(row.id),
      isPrimary: Boolean(row.is_primary),
      status: row.status === "active" ? "active" : "disabled",
      tenantCode: row.tenant_code,
      tenantId: Number(row.tenant_id),
      tenantName: row.tenant_name,
      tenantStatus: row.tenant_status,
      uuid: row.uuid,
      verificationStatus: row.verification_status === "verified" ? "verified" : "pending",
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null
    }));
  }

  async listByTenantId(tenantId: number) {
    return (await this.listAll()).filter((domain) => domain.tenantId === tenantId);
  }

  async findVerifiedTenantIdByDomain(value: string) {
    const domain = normalizeTenantDomain(value);
    if (!domain || isCanonicalAppHost(domain)) return null;
    const row = await getPlatformDatabase()
      .selectFrom("app_tenant_domains")
      .select("tenant_id")
      .where("domain", "=", domain)
      .where("status", "=", "active")
      .where("verification_status", "=", "verified")
      .executeTakeFirst();
    return row ? Number(row.tenant_id) : null;
  }

  async primaryDomainForTenant(tenantId: number, fallbackSlug: string) {
    const row = await getPlatformDatabase()
      .selectFrom("app_tenant_domains")
      .select("domain")
      .where("tenant_id", "=", tenantId)
      .where("is_primary", "=", true)
      .executeTakeFirst();
    return normalizeTenantDomain(row?.domain ?? defaultTenantDomainForSlug(fallbackSlug));
  }

  async upsertPrimaryDomain(input: { domain: string; tenantId: number }) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain || isCanonicalAppHost(domain)) return canonicalAppHost();
    const existing = await getPlatformDatabase()
      .selectFrom("app_tenant_domains")
      .select(["id", "tenant_id"])
      .where("domain", "=", domain)
      .executeTakeFirst();
    if (existing && Number(existing.tenant_id) !== input.tenantId) {
      throw AppError.conflict("Domain is already mapped to another tenant.");
    }
    if (existing) {
      await getPlatformDatabase()
        .updateTable("app_tenant_domains")
        .set({ is_primary: true })
        .where("id", "=", Number(existing.id))
        .execute();
      return domain;
    }
    const created = await this.create({ domain, isPrimary: true, tenantId: input.tenantId });
    return created?.domain ?? domain;
  }

  async create(input: TenantDomainSavePayload) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain || isCanonicalAppHost(domain)) {
      throw AppError.validation("Use a custom domain; the shared application host is reserved.");
    }
    const verificationToken = randomBytes(24).toString("base64url");
    await getPlatformDatabase()
      .insertInto("app_tenant_domains")
      .values({
        domain,
        is_primary: Boolean(input.isPrimary),
        status: "disabled",
        tenant_id: input.tenantId,
        uuid: randomBytes(4).toString("hex"),
        verification_status: "pending",
        verification_token_hash: hashToken(verificationToken),
        verified_at: null
      })
      .execute();
    const record = (await this.listAll()).find(
      (item) => item.tenantId === input.tenantId && item.domain === domain
    );
    return record ? { ...record, verificationToken } : null;
  }

  async update(id: number, input: TenantDomainSavePayload) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain || isCanonicalAppHost(domain)) {
      throw AppError.validation("Use a custom domain; the shared application host is reserved.");
    }
    const verificationToken = randomBytes(24).toString("base64url");
    await getPlatformDatabase()
      .updateTable("app_tenant_domains")
      .set({
        domain,
        is_primary: Boolean(input.isPrimary),
        status: "disabled",
        tenant_id: input.tenantId,
        verification_status: "pending",
        verification_token_hash: hashToken(verificationToken),
        verified_at: null
      })
      .where("id", "=", id)
      .execute();
    const record = await this.findById(id);
    return record ? { ...record, verificationToken } : null;
  }

  async verify(id: number, discoveredTokens: string[]) {
    const row = await getPlatformDatabase()
      .selectFrom("app_tenant_domains")
      .select("verification_token_hash")
      .where("id", "=", id)
      .executeTakeFirst();
    if (
      !row?.verification_token_hash ||
      !discoveredTokens.some((token) => hashToken(token) === row.verification_token_hash)
    ) {
      return null;
    }
    await getPlatformDatabase()
      .updateTable("app_tenant_domains")
      .set({ status: "active", verification_status: "verified", verified_at: new Date() })
      .where("id", "=", id)
      .execute();
    return this.findById(id);
  }

  async findById(id: number): Promise<TenantDomainRecord | null> {
    return (await this.listAll()).find((domain) => domain.id === id) ?? null;
  }
}

export function defaultTenantDomainForSlug(_slug: string) {
  return canonicalAppHost();
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

export function canonicalAppHost() {
  return normalizeTenantDomain(new URL(env.PLATFORM_WEB_ORIGIN).hostname);
}

export function isCanonicalAppHost(value: string) {
  return normalizeTenantDomain(value) === canonicalAppHost();
}

export function tenantDomainVerificationName(domain: string) {
  return `_codexsun-verification.${normalizeTenantDomain(domain)}`;
}

function hashToken(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex");
}
