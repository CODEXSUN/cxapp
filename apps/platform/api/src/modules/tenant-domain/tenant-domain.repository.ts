import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@cxapp/framework/errors";
import { getPlatformDatabase } from "../../database/platform-database.js";
import { env } from "../../env.js";
import type { TenantDomainRecord, TenantDomainSavePayload } from "./tenant-domain.types.js";

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
        "tenant_domains.status",
        "tenant_domains.verification_status",
        "tenant_domains.verified_at",
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
      .selectFrom("tenant_domains")
      .select("tenant_id")
      .where("domain", "=", domain)
      .where("status", "=", "active")
      .where("verification_status", "=", "verified")
      .executeTakeFirst();
    return row ? Number(row.tenant_id) : null;
  }

  async primaryDomainForTenant(tenantId: number, fallbackSlug: string) {
    const row = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select("domain")
      .where("tenant_id", "=", tenantId)
      .where("is_primary", "=", true)
      .executeTakeFirst();
    return normalizeTenantDomain(row?.domain ?? defaultTenantDomainForSlug(fallbackSlug));
  }

  async upsertPrimaryDomain(input: { domain: string; tenantId: number }) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain || isSharedApplicationHost(domain)) return canonicalAppHost();
    const existing = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select(["id", "tenant_id"])
      .where("domain", "=", domain)
      .executeTakeFirst();
    if (existing && Number(existing.tenant_id) !== input.tenantId) {
      throw AppError.conflict("Domain is already mapped to another tenant.");
    }
    if (existing) {
      await getPlatformDatabase()
        .updateTable("tenant_domains")
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
      .insertInto("tenant_domains")
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

  async update(uuid: string, input: TenantDomainSavePayload) {
    const domain = normalizeTenantDomain(input.domain);
    if (!domain || isCanonicalAppHost(domain)) {
      throw AppError.validation("Use a custom domain; the shared application host is reserved.");
    }
    const verificationToken = randomBytes(24).toString("base64url");
    await getPlatformDatabase()
      .updateTable("tenant_domains")
      .set({
        domain,
        is_primary: Boolean(input.isPrimary),
        status: "disabled",
        tenant_id: input.tenantId,
        verification_status: "pending",
        verification_token_hash: hashToken(verificationToken),
        verified_at: null
      })
      .where("uuid", "=", uuid)
      .execute();
    const record = await this.findByUuid(uuid);
    return record ? { ...record, verificationToken } : null;
  }

  async verify(uuid: string, discoveredTokens: string[]) {
    const row = await getPlatformDatabase()
      .selectFrom("tenant_domains")
      .select("verification_token_hash")
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    if (
      !row?.verification_token_hash ||
      !discoveredTokens.some((token) => hashToken(token) === row.verification_token_hash)
    ) {
      return null;
    }
    await getPlatformDatabase()
      .updateTable("tenant_domains")
      .set({ status: "active", verification_status: "verified", verified_at: new Date() })
      .where("uuid", "=", uuid)
      .execute();
    return this.findByUuid(uuid);
  }

  async findByUuid(uuid: string): Promise<TenantDomainRecord | null> {
    return (await this.listAll()).find((domain) => domain.uuid === uuid) ?? null;
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

export function isSharedApplicationHost(value: string) {
  const host = normalizeTenantDomain(value);
  if (host === canonicalAppHost()) return true;
  return env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1");
}

export function tenantDomainVerificationName(domain: string) {
  return `_cxapp-verification.${normalizeTenantDomain(domain)}`;
}

function hashToken(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex");
}
