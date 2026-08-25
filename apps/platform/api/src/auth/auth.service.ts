import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import {
  isSharedApplicationHost,
  normalizeTenantDomain
} from "../modules/tenant-domain/tenant-domain.repository.js";
import { getTenantDatabase } from "../database/tenant-database.js";
import { signAuthToken, type AuthUserType, type TenantAccessMode } from "./jwt.js";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "./password-hash.js";
import {
  AuthSessionRepository,
  emptySessionCache,
  type TenantSessionCache
} from "./auth-session.repository.js";
import { CredentialRecoveryRepository } from "../modules/credential-recovery/index.js";
import { env } from "../env.js";

const tenantRepository = new TenantRepository();
const credentialRepository = new CredentialRecoveryRepository();
const sessionRepository = new AuthSessionRepository();

export class AuthService {
  async login(input: LoginInput) {
    const desk = normalizeDesk(input.desk);
    const email = input.email?.trim().toLowerCase() ?? "";
    const password = input.password ?? "";
    const loginHost = normalizeTenantDomain(input.domain ?? "");
    if (!email || !password || !loginHost) return null;
    if (desk === "tenant") return this.loginTenant({ ...input, email, loginHost, password });
    if (!isSharedApplicationHost(loginHost)) return null;
    return this.loginPlatformUser({ desk, email, loginHost, password });
  }

  private async loginTenant(
    input: Required<Pick<LoginInput, "email" | "password">> & LoginInput & { loginHost: string }
  ) {
    const shared = isSharedApplicationHost(input.loginHost);
    const corporateId = input.corporateId?.trim().toUpperCase() ?? "";
    if (shared && !corporateId) return null;
    const tenant = shared
      ? await tenantRepository.findByCorporateId(corporateId)
      : await tenantRepository.findByDomain(input.loginHost);
    if (
      !tenant ||
      tenant.status !== "active" ||
      (corporateId && tenant.corporateId?.trim().toUpperCase() !== corporateId)
    ) {
      return null;
    }
    const user = await tenantRepository.findTenantUserByEmail(tenant, input.email);
    if (!user || user.status !== "active" || !verifyPassword(input.password, user.password_hash)) {
      return null;
    }
    if (passwordNeedsRehash(user.password_hash)) {
      await tenantRepository.updateTenantUserPasswordHash(
        tenant,
        user.uuid,
        hashPassword(input.password)
      );
    }
    const mode: TenantAccessMode = shared ? "shared_domain" : "custom_domain";
    const context = await buildTenantSessionCache(tenant);
    const jti = randomUUID();
    const accessToken = signAuthToken(
      {
        email: user.email,
        loginHost: input.loginHost,
        name: user.name,
        tenantAccessMode: mode,
        tenantCode: tenant.tenantCode,
        tenantDbName: tenant.dbName,
        tenantId: tenant.uuid,
        tenantUuid: tenant.uuid,
        userId: user.uuid,
        userType: "tenant"
      },
      { jti }
    );
    await sessionRepository.create({
      context,
      expiresAt: expiresAt(),
      jti,
      loginHost: input.loginHost,
      tenantAccessMode: mode,
      tenantCode: tenant.tenantCode,
      tenantDbName: tenant.dbName,
      tenantId: tenant.uuid,
      userEmail: user.email,
      userName: user.name,
      userType: "tenant",
      userUuid: user.uuid
    });
    return {
      accessToken,
      context,
      corporateId: tenant.corporateId,
      email: user.email,
      name: user.name,
      tenantCode: tenant.tenantCode,
      tenantDbName: tenant.dbName,
      tenantId: tenant.uuid,
      tenantUuid: tenant.uuid,
      userType: "tenant" as const
    };
  }

  private async loginPlatformUser(input: {
    desk: "staff" | "super_admin";
    email: string;
    loginHost: string;
    password: string;
  }) {
    const credential = await credentialRepository.findPlatformCredential(input.desk, input.email);
    if (
      !credential ||
      credential.status !== "active" ||
      !verifyPassword(input.password, credential.passwordHash)
    ) {
      return null;
    }
    if (passwordNeedsRehash(credential.passwordHash)) {
      await credentialRepository.updatePlatformCredentialPasswordHash(
        input.desk,
        credential.uuid,
        hashPassword(input.password)
      );
    }
    const jti = randomUUID();
    const context = emptySessionCache();
    const accessToken = signAuthToken(
      {
        email: credential.email,
        loginHost: input.loginHost,
        name: credential.name,
        tenantAccessMode: "platform",
        userId: credential.uuid,
        userType: input.desk
      },
      { jti }
    );
    await sessionRepository.create({
      context,
      expiresAt: expiresAt(),
      jti,
      loginHost: input.loginHost,
      tenantAccessMode: "platform",
      tenantCode: null,
      tenantDbName: null,
      tenantId: null,
      userEmail: credential.email,
      userName: credential.name,
      userType: input.desk,
      userUuid: credential.uuid
    });
    return {
      accessToken,
      context,
      email: credential.email,
      name: credential.name,
      userType: input.desk
    };
  }
}

type LoginInput = {
  corporateId?: string;
  desk?: unknown;
  domain?: string;
  email?: string;
  password?: string;
};

function normalizeDesk(value: unknown): AuthUserType {
  if (value === "sa" || value === "super_admin") return "super_admin";
  if (value === "admin" || value === "staff") return "staff";
  return "tenant";
}

function expiresAt() {
  return new Date(Date.now() + env.AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000);
}

async function buildTenantSessionCache(tenant: Tenant): Promise<TenantSessionCache> {
  let defaultCompany: TenantSessionCache["defaultCompany"] = null;
  try {
    const result = await sql<{
      company_id: number | string;
      company_name: string;
      financial_year_id: number | string;
      financial_year_name: string;
      landing_app: string;
    }>`SELECT d.company_id,c.name AS company_name,d.financial_year_id,
      f.name AS financial_year_name,d.landing_app
      FROM core_default_company_settings d
      INNER JOIN core_companies c ON c.id=d.company_id
      INNER JOIN core_financial_years f ON f.id=d.financial_year_id
      WHERE d.singleton_key=1 AND d.status='active' LIMIT 1`.execute(getTenantDatabase(tenant));
    const row = result.rows[0];
    if (row) {
      defaultCompany = {
        companyId: Number(row.company_id),
        companyName: row.company_name,
        financialYearId: Number(row.financial_year_id),
        financialYearName: row.financial_year_name,
        landingApp: row.landing_app
      };
    }
  } catch {}
  const landingPage = defaultCompany?.landingApp || tenant.defaultLandingApp;
  return {
    cachedAt: new Date().toISOString(),
    company: defaultCompany
      ? { code: "", id: defaultCompany.companyId, name: defaultCompany.companyName }
      : null,
    defaultCompany,
    enabledModuleKeys: [...tenant.enabledModuleKeys],
    landingPage,
    safeSettings: { landing: landingPage },
    tenant: { code: tenant.tenantCode, id: tenant.uuid, name: tenant.tenantName }
  };
}
