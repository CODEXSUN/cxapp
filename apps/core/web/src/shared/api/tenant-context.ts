const TENANT_TOKEN_KEY = "cxapp_session_tenant";
const TENANT_ID_KEY = "cxapp_tenant_id";
const TENANT_DB_NAME_KEY = "cxapp_tenant_db_name";
const ACCOUNTING_YEAR_ID_KEY = "cxapp.tenant.financial-year-id";

export function getToken(_desk?: "tenant"): string | null {
  try {
    localStorage.removeItem(TENANT_TOKEN_KEY);
  } catch {}
  return null;
}

export function getTenantDbName(): string | null {
  try {
    return sessionStorage.getItem(TENANT_DB_NAME_KEY);
  } catch {
    return null;
  }
}

export function getTenantId(): string | null {
  try {
    return sessionStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function getAccountingYearId(): number | null {
  try {
    const value = Number(localStorage.getItem(ACCOUNTING_YEAR_ID_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setAccountingYearId(id: number | null): void {
  try {
    if (id) localStorage.setItem(ACCOUNTING_YEAR_ID_KEY, String(id));
    else localStorage.removeItem(ACCOUNTING_YEAR_ID_KEY);
    window.dispatchEvent(new CustomEvent("cxapp:accounting-year-change", { detail: { id } }));
  } catch {}
}
