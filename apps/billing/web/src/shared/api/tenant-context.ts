const TENANT_TOKEN_KEY = "codexsun_session_tenant";
const TENANT_ID_KEY = "codexsun_tenant_id";
const TENANT_DB_NAME_KEY = "codexsun_tenant_db_name";
const COMPANY_ID_KEY = "codexsun.tenant.company-id";
const FINANCIAL_YEAR_ID_KEY = "codexsun.tenant.financial-year-id";

export function getToken(_desk?: "tenant"): string | null {
  try {
    return localStorage.getItem(TENANT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function getTenantDbName(): string | null {
  try {
    return localStorage.getItem(TENANT_DB_NAME_KEY);
  } catch {
    return null;
  }
}

export function getCompanyId(): number | null {
  try {
    const value = Number(localStorage.getItem(COMPANY_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getFinancialYearId(): number | null {
  try {
    const value = Number(localStorage.getItem(FINANCIAL_YEAR_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getTenantUserLabel(): string {
  return getTenantUserIdentity().name;
}

export function getTenantUserIdentity(): { email: string; name: string } {
  const token = getToken("tenant");
  if (!token) return { email: "", name: "Tenant User" };

  try {
    const encoded = token.split(".")[1];
    if (!encoded) return { email: "", name: "Tenant User" };
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as {
      email?: unknown;
      name?: unknown;
    };
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    return {
      email,
      name: name || email.split("@")[0]?.trim() || "Tenant User"
    };
  } catch {
    return { email: "", name: "Tenant User" };
  }
}
