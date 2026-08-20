import { AppError } from "@cxapp/framework/errors";
import { platformApiBaseUrl } from "../../env.js";
import type { CashBookLedger } from "./cash-book.types.js";

export type CashBookLookupHeaders = {
  authorization?: string | string[] | undefined;
  tenantDatabase?: string | string[] | undefined;
  tenantId?: string | string[] | undefined;
};

export type CashBookLedgerGroup = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

type CoreLedgerRecord = {
  id: number;
  ledgerGroupName: string;
  name: string;
};

export class CashBookLookupService {
  ledgerGroups(headers: CashBookLookupHeaders) {
    return this.request<CashBookLedgerGroup[]>("/core/common/accounts/ledger-groups", headers);
  }

  async createLedger(
    headers: CashBookLookupHeaders,
    input: { ledgerGroupId: number; name: string; status: "active" | "inactive" }
  ): Promise<CashBookLedger> {
    const record = await this.request<CoreLedgerRecord>("/core/common/accounts/ledgers", headers, {
      body: JSON.stringify(input),
      method: "POST"
    });
    return { groupName: record.ledgerGroupName, id: record.id, name: record.name };
  }

  private async request<T>(
    path: string,
    headers: CashBookLookupHeaders,
    init?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${platformApiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(headerValue(headers.authorization)
          ? { Authorization: headerValue(headers.authorization)! }
          : {}),
        ...(headerValue(headers.tenantDatabase)
          ? { "x-tenant-db": headerValue(headers.tenantDatabase)! }
          : {}),
        ...(headerValue(headers.tenantId) ? { "x-tenant-id": headerValue(headers.tenantId)! } : {})
      }
    });
    const payload = (await response.json()) as {
      data?: T;
      error?: { message?: string };
      success?: boolean;
    };
    if (!response.ok || payload.success === false) {
      const message = payload.error?.message || "Core ledger lookup could not be completed.";
      if (response.status === 400 || response.status === 422) throw AppError.validation(message);
      if (response.status === 401) throw AppError.unauthorized(message);
      if (response.status === 403) throw AppError.forbidden(message);
      if (response.status === 404) throw AppError.notFound(message);
      if (response.status === 409) throw AppError.conflict(message);
      throw new Error(message);
    }
    if (payload.data === undefined) throw new Error("Core ledger lookup returned no data.");
    return payload.data;
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
