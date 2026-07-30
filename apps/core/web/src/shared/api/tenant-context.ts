const TENANT_TOKEN_KEY = "codexsun_session_tenant";
const TENANT_ID_KEY = "codexsun_tenant_id";
const TENANT_DB_NAME_KEY = "codexsun_tenant_db_name";
const ACCOUNTING_YEAR_ID_KEY = "codexsun.tenant.financial-year-id";

export function getToken(_desk?: "tenant"): string | null {
  try {
    return localStorage.getItem(TENANT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getTenantDbName(): string | null {
  try {
    return (
      localStorage.getItem(TENANT_DB_NAME_KEY) ??
      import.meta.env.VITE_DEFAULT_TENANT_DB_NAME?.trim() ??
      null
    );
  } catch {
    return import.meta.env.VITE_DEFAULT_TENANT_DB_NAME?.trim() ?? null;
  }
}

export function getTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
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
    window.dispatchEvent(new CustomEvent("codexsun:accounting-year-change", { detail: { id } }));
  } catch {}
}
