import { platformApiBaseUrl } from "../../env.js";
import {
  coreLookupListSchema,
  coreLookupRecordSchema
} from "../../shared/core-lookup.contracts.js";
import type { ZodType } from "zod";
import { AppError } from "@cxapp/framework/errors";

export type QuotationLookupHeaders = {
  authorization?: string | string[] | undefined;
  tenantDatabase?: string | string[] | undefined;
  tenantId?: string | string[] | undefined;
};

export class QuotationLookupService {
  contacts(headers: QuotationLookupHeaders) {
    return this.get("/core/master/contacts", headers);
  }
  contactTypes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/contacts/contact-types", headers);
  }
  createContact(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/master/contacts", headers, input);
  }
  updateContact(headers: QuotationLookupHeaders, id: string, input: unknown) {
    return this.put(`/core/master/contacts/${encodeURIComponent(id)}`, headers, input);
  }
  updateContactAddress(
    headers: QuotationLookupHeaders,
    contactId: string,
    addressId: string,
    input: unknown
  ) {
    return this.put(
      `/core/master/contacts/${encodeURIComponent(contactId)}/addresses/${encodeURIComponent(addressId)}`,
      headers,
      input
    );
  }
  createContactAddress(headers: QuotationLookupHeaders, contactId: string, input: unknown) {
    return this.post(
      `/core/master/contacts/${encodeURIComponent(contactId)}/addresses`,
      headers,
      input
    );
  }
  countries(headers: QuotationLookupHeaders) {
    return this.get("/core/common/location/countries", headers);
  }
  states(headers: QuotationLookupHeaders) {
    return this.get("/core/common/location/states", headers);
  }
  createState(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/location/states", headers, input);
  }
  districts(headers: QuotationLookupHeaders) {
    return this.get("/core/common/location/districts", headers);
  }
  createDistrict(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/location/districts", headers, input);
  }
  cities(headers: QuotationLookupHeaders) {
    return this.get("/core/common/location/cities", headers);
  }
  createCity(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/location/cities", headers, input);
  }
  pincodes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/location/pincodes", headers);
  }
  createPincode(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/location/pincodes", headers, input);
  }
  addressTypes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/contacts/address-types", headers);
  }
  createAddressType(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/contacts/address-types", headers, input);
  }
  products(headers: QuotationLookupHeaders) {
    return this.get("/core/master/products", headers);
  }
  createProduct(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/master/products", headers, input);
  }
  updateProduct(headers: QuotationLookupHeaders, id: string, input: unknown) {
    return this.put(`/core/master/products/${encodeURIComponent(id)}`, headers, input);
  }
  workOrders(headers: QuotationLookupHeaders) {
    return this.get("/core/master/work-orders", headers);
  }
  createWorkOrder(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/master/work-orders", headers, input);
  }
  updateWorkOrder(headers: QuotationLookupHeaders, id: string, input: unknown) {
    return this.put(`/core/master/work-orders/${encodeURIComponent(id)}`, headers, input);
  }
  colours(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/colours", headers);
  }
  createColour(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/colours", headers, input);
  }
  sizes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/sizes", headers);
  }
  createSize(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/sizes", headers, input);
  }
  productCategories(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/product-categories", headers);
  }
  createProductCategory(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/product-categories", headers, input);
  }
  hsnCodes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/hsn-codes", headers);
  }
  createHsnCode(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/hsn-codes", headers, input);
  }
  units(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/units", headers);
  }
  createUnit(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/units", headers, input);
  }
  taxes(headers: QuotationLookupHeaders) {
    return this.get("/core/common/products/taxes", headers);
  }
  createTax(headers: QuotationLookupHeaders, input: unknown) {
    return this.post("/core/common/products/taxes", headers, input);
  }
  ledgers(headers: QuotationLookupHeaders) {
    return this.get("/core/common/accounts/ledgers", headers);
  }

  private get(path: string, headers: QuotationLookupHeaders) {
    return this.request(path, headers).then((response) =>
      responseData(response, coreLookupListSchema, [])
    );
  }
  private post(path: string, headers: QuotationLookupHeaders, input: unknown) {
    return this.request(path, headers, { body: JSON.stringify(input), method: "POST" }).then(
      (response) => responseData(response, coreLookupRecordSchema)
    );
  }
  private put(path: string, headers: QuotationLookupHeaders, input: unknown) {
    return this.request(path, headers, { body: JSON.stringify(input), method: "PUT" }).then(
      (response) => responseData(response, coreLookupRecordSchema)
    );
  }
  private request(path: string, headers: QuotationLookupHeaders, init?: RequestInit) {
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
    const message = payload.error?.message || "Quotation lookup could not be loaded.";
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
