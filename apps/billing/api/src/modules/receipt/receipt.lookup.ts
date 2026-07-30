import { platformApiBaseUrl } from "../../env.js";
import {
  coreLookupListSchema,
  coreLookupRecordSchema
} from "../../shared/core-lookup.contracts.js";
import type { ZodType } from "zod";
import { AppError } from "@cxapp/framework/errors";

export type ReceiptLookupHeaders = {
  authorization?: string | string[] | undefined;
  tenantDatabase?: string | string[] | undefined;
  tenantId?: string | string[] | undefined;
};

export class ReceiptLookupService {
  contacts(headers: ReceiptLookupHeaders) {
    return this.get("/core/master/contacts", headers);
  }
  contactTypes(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/contacts/contact-types", headers);
  }
  createContact(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/master/contacts", headers, input);
  }
  countries(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/location/countries", headers);
  }
  states(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/location/states", headers);
  }
  createState(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/common/location/states", headers, input);
  }
  districts(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/location/districts", headers);
  }
  createDistrict(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/common/location/districts", headers, input);
  }
  cities(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/location/cities", headers);
  }
  createCity(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/common/location/cities", headers, input);
  }
  pincodes(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/location/pincodes", headers);
  }
  createPincode(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/common/location/pincodes", headers, input);
  }
  addressTypes(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/contacts/address-types", headers);
  }
  createAddressType(headers: ReceiptLookupHeaders, input: unknown) {
    return this.post("/core/common/contacts/address-types", headers, input);
  }
  ledgers(headers: ReceiptLookupHeaders) {
    return this.get("/core/common/accounts/ledgers", headers);
  }
  private get(path: string, headers: ReceiptLookupHeaders) {
    return this.request(path, headers).then((response) =>
      responseData(response, coreLookupListSchema, [])
    );
  }
  private post(path: string, headers: ReceiptLookupHeaders, input: unknown) {
    return this.request(path, headers, { body: JSON.stringify(input), method: "POST" }).then(
      (response) => responseData(response, coreLookupRecordSchema)
    );
  }
  private request(path: string, headers: ReceiptLookupHeaders, init?: RequestInit) {
    return fetch(`${platformApiBaseUrl}${path}`, {
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
  }
}

async function responseData<T>(response: Response, schema: ZodType<T>, fallback?: T) {
  const payload = (await response.json()) as {
    data?: unknown;
    error?: { message?: string };
    success?: boolean;
  };
  if (!response.ok || payload.success === false) {
    const message = payload.error?.message || "Receipt lookup could not be loaded.";
    if (response.status === 400 || response.status === 422) throw AppError.validation(message);
    if (response.status === 401) throw AppError.unauthorized(message);
    if (response.status === 403) throw AppError.forbidden(message);
    if (response.status === 404) throw AppError.notFound(message);
    if (response.status === 409) throw AppError.conflict(message);
    throw new Error(message);
  }
  return schema.parse(payload.data ?? fallback);
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
