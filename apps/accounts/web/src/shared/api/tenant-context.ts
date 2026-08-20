const TENANT_ID_KEY = "cxapp_tenant_id";
const TENANT_DB_NAME_KEY = "cxapp_tenant_db_name";
const COMPANY_ID_KEY = "cxapp.tenant.company-id";
const FINANCIAL_YEAR_ID_KEY = "cxapp.tenant.financial-year-id";

export function getTenantId(): string | null {
  try {
    return sessionStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function getTenantDbName(): string | null {
  try {
    return sessionStorage.getItem(TENANT_DB_NAME_KEY);
  } catch {
    return null;
  }
}

export function getCompanyId(): number | null {
  try {
    const value = Number(sessionStorage.getItem(COMPANY_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getFinancialYearId(): number | null {
  try {
    const value = Number(sessionStorage.getItem(FINANCIAL_YEAR_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getTenantUserIdentity(): { email: string; name: string } {
  try {
    const value = sessionStorage.getItem("cxapp.auth.identity");
    const identity = value ? (JSON.parse(value) as { email?: unknown; name?: unknown }) : null;
    const email = typeof identity?.email === "string" ? identity.email.trim() : "";
    const name = typeof identity?.name === "string" ? identity.name.trim() : "";
    return {
      email,
      name: name || email.split("@")[0]?.trim() || "Tenant User"
    };
  } catch {
    return { email: "", name: "Tenant User" };
  }
}
