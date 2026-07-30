import { getTenantDbName, getTenantId, getToken } from "../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../shared/env/client-env";
import type {
  ContactCityLookup,
  ContactCountryLookup,
  ContactDistrictLookup,
  ContactLookups,
  ContactNamedLookup,
  ContactNextCode,
  ContactPincodeLookup,
  ContactRecord,
  ContactSavePayload,
  ContactStateLookup
} from "./contact.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const contactPath = "/core/master/contacts";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function contactRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const database = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${contactPath}${suffix}`, {
    ...options,
    headers: requestHeaders(options, token, database)
  });
  return readEnvelope<T>(response);
}

async function fixedLookupRequest<T>(path: string, options: RequestInit = {}) {
  const token = getToken("tenant");
  const database = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${path}`, {
    ...options,
    headers: requestHeaders(options, token, database)
  });
  return readEnvelope<T>(response);
}

function requestHeaders(options: RequestInit, token: string | null, database: string | null) {
  return {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(database ? { "x-tenant-db": database } : {}),
    ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
    ...options.headers
  };
}

async function readEnvelope<T>(response: Response) {
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Core API request failed." : body.error.message);
  }
  return body.data;
}

export const listContacts = (search = "") =>
  contactRequest<ContactRecord[]>(`?search=${encodeURIComponent(search)}`);
export const getNextContactCode = () => contactRequest<ContactNextCode>("/next-code");
export const getContact = (id: number) => contactRequest<ContactRecord>(`/${id}`);
export const createContact = (payload: ContactSavePayload) =>
  contactRequest<ContactRecord>("", { body: JSON.stringify(payload), method: "POST" });
export const updateContact = (id: number, payload: ContactSavePayload) =>
  contactRequest<ContactRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
export const setContactActive = (id: number, active: boolean) =>
  contactRequest<ContactRecord>(`/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
export const forceDeleteContact = (id: number) =>
  contactRequest<ContactRecord>(`/${id}/force`, { method: "DELETE" });

export async function listContactLookups(): Promise<ContactLookups> {
  const [
    contactTypes,
    contactGroups,
    addressTypes,
    bankNames,
    countries,
    states,
    districts,
    cities,
    pincodes
  ] = await Promise.all([
    fixedLookupRequest<ContactNamedLookup[]>("/core/common/contacts/contact-types"),
    fixedLookupRequest<ContactNamedLookup[]>("/core/common/contacts/contact-groups"),
    fixedLookupRequest<ContactNamedLookup[]>("/core/common/contacts/address-types"),
    fixedLookupRequest<ContactNamedLookup[]>("/core/common/contacts/bank-names"),
    fixedLookupRequest<ContactCountryLookup[]>("/core/common/location/countries"),
    fixedLookupRequest<ContactStateLookup[]>("/core/common/location/states"),
    fixedLookupRequest<ContactDistrictLookup[]>("/core/common/location/districts"),
    fixedLookupRequest<ContactCityLookup[]>("/core/common/location/cities"),
    fixedLookupRequest<ContactPincodeLookup[]>("/core/common/location/pincodes")
  ]);
  return {
    contactTypes,
    contactGroups,
    addressTypes,
    bankNames,
    countries,
    states,
    districts,
    cities,
    pincodes
  };
}

export const createContactTypeLookup = (name: string) =>
  fixedLookupRequest<ContactNamedLookup>("/core/common/contacts/contact-types", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createContactGroupLookup = (name: string) =>
  fixedLookupRequest<ContactNamedLookup>("/core/common/contacts/contact-groups", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createAddressTypeLookup = (name: string) =>
  fixedLookupRequest<ContactNamedLookup>("/core/common/contacts/address-types", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createBankNameLookup = (name: string) =>
  fixedLookupRequest<ContactNamedLookup>("/core/common/contacts/bank-names", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createCountryLookup = (name: string) =>
  fixedLookupRequest<ContactCountryLookup>("/core/common/location/countries", {
    body: JSON.stringify({ code: lookupCode(name), name, sortOrder: 1000, status: "active" }),
    method: "POST"
  });
export const createStateLookup = (name: string, countryId: number) =>
  fixedLookupRequest<ContactStateLookup>("/core/common/location/states", {
    body: JSON.stringify({
      code: lookupCode(name),
      countryId,
      name,
      sortOrder: 1000,
      status: "active"
    }),
    method: "POST"
  });
export const createDistrictLookup = (name: string, stateId: number) =>
  fixedLookupRequest<ContactDistrictLookup>("/core/common/location/districts", {
    body: JSON.stringify({ stateId, name, sortOrder: 1000, status: "active" }),
    method: "POST"
  });
export const createCityLookup = (name: string, districtId: number) =>
  fixedLookupRequest<ContactCityLookup>("/core/common/location/cities", {
    body: JSON.stringify({ districtId, name, sortOrder: 1000, status: "active" }),
    method: "POST"
  });
export const createPincodeLookup = (postalCode: string, area: string, cityId: number) =>
  fixedLookupRequest<ContactPincodeLookup>("/core/common/location/pincodes", {
    body: JSON.stringify({ area, cityId, name: postalCode, sortOrder: 1000, status: "active" }),
    method: "POST"
  });

function lookupCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}
