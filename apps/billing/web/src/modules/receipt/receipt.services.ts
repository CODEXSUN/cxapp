import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import type {
  Receipt,
  ReceiptActivity,
  ReceiptAllocationCandidate,
  ReceiptContext,
  ReceiptContactSavePayload,
  ReceiptLocationKind,
  ReceiptLocationRecord,
  ReceiptLookupOption,
  ReceiptLookupRecord,
  ReceiptSavePayload
} from "./receipt.types";

export const listReceipts = () => billingApiGet<Receipt[]>("/billing/receipts");
export const listReceiptsPage = (query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search,
    status: query.status
  });
  return billingApiGet<import("./receipt.types").ReceiptPageResult>(
    `/billing/receipts/page?${params}`
  );
};
export const getReceiptContext = () => billingApiGet<ReceiptContext>("/billing/receipts/context");
export const getReceipt = (id: string) => billingApiGet<Receipt>(`/billing/receipts/${id}`);
export const listReceiptActivity = (id: string) =>
  billingApiGet<ReceiptActivity[]>(`/billing/receipts/${id}/activity`);
export const createReceipt = (input: ReceiptSavePayload) =>
  billingApiPost<Receipt>("/billing/receipts", input);
export const updateReceipt = (id: string, input: ReceiptSavePayload) =>
  billingApiPut<Receipt>(`/billing/receipts/${id}`, input);
export const postReceipt = (id: string) => billingApiPost<Receipt>(`/billing/receipts/${id}/post`);
export const cancelReceipt = (id: string) =>
  billingApiPost<Receipt>(`/billing/receipts/${id}/cancel`);
export const deleteReceipt = (id: string) => billingApiDelete<Receipt>(`/billing/receipts/${id}`);
export const listReceiptAllocations = (customerId: number) =>
  customerId > 0
    ? billingApiGet<ReceiptAllocationCandidate[]>(
        `/billing/receipts/allocations?customerId=${customerId}`
      )
    : Promise.resolve([]);
export const listReceiptContacts = () =>
  billingApiGet<ReceiptLookupRecord[]>("/billing/receipts/lookups/contacts").then((rows) =>
    options(rows, "contact")
  );
export const listReceiptContactTypes = () =>
  billingApiGet<ReceiptLookupRecord[]>("/billing/receipts/lookups/contact-types").then((rows) =>
    options(rows, "contact")
  );
export const createReceiptContact = (payload: ReceiptContactSavePayload) =>
  billingApiPost<ReceiptLookupRecord>("/billing/receipts/lookups/contacts", {
    addresses: contactAddresses(payload),
    emails: payload.primaryEmail.trim()
      ? [{ email: payload.primaryEmail.trim(), emailType: "Work", isPrimary: true }]
      : [],
    gstin: payload.gstin.trim().toUpperCase(),
    isActive: true,
    legalName: payload.legalName.trim(),
    name: payload.name.trim(),
    phones: payload.primaryPhone.trim()
      ? [{ isPrimary: true, phone: payload.primaryPhone.trim(), phoneType: "Mobile" }]
      : [],
    typeId: Number(payload.typeId)
  }).then((record) => ({ ...record, id: String(record.id) }));
export const listReceiptLocations = (
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) =>
  billingApiGet<ReceiptLocationRecord[]>(receiptLocationListPaths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
export const createReceiptLocation = (
  kind: ReceiptLocationKind,
  payload: Record<string, unknown>
) =>
  billingApiPost<ReceiptLocationRecord>(receiptLocationCreatePaths[kind], payload).then(
    normalizeLocationRecord
  );
export const listReceiptAddressTypes = () =>
  billingApiGet<ReceiptLookupRecord[]>("/billing/receipts/lookups/address-types").then((records) =>
    records.map(normalizeLookupRecord)
  );
export const createReceiptAddressType = (name: string) =>
  billingApiPost<ReceiptLookupRecord>("/billing/receipts/lookups/address-types", {
    isActive: true,
    name: name.trim()
  }).then(normalizeLookupRecord);
export const listReceiptLedgers = () =>
  billingApiGet<ReceiptLookupRecord[]>("/billing/receipts/lookups/ledgers").then((rows) =>
    options(rows, "ledger")
  );
export function formatReceiptMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value);
}
export function formatReceiptDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date
      );
}

const receiptLocationListPaths = {
  cities: "/billing/receipts/lookups/cities",
  countries: "/billing/receipts/lookups/countries",
  districts: "/billing/receipts/lookups/districts",
  pincodes: "/billing/receipts/lookups/pincodes",
  states: "/billing/receipts/lookups/states"
} as const;

const receiptLocationCreatePaths = {
  cities: "/billing/receipts/lookups/cities",
  districts: "/billing/receipts/lookups/districts",
  pincodes: "/billing/receipts/lookups/pincodes",
  states: "/billing/receipts/lookups/states"
} as const;

function options(rows: ReceiptLookupRecord[], kind: "contact" | "ledger"): ReceiptLookupOption[] {
  return rows
    .filter((row) => row.isActive !== false)
    .map((source) => {
      const record = { ...source, id: String(source.id) };
      return {
        description:
          kind === "contact" ? record.primaryPhone || record.primaryEmail || "" : record.code || "",
        label: record.name || record.code || record.id,
        record,
        value: record.id
      };
    });
}

function contactAddresses(payload: ReceiptContactSavePayload) {
  if (
    !payload.addressLine1.trim() &&
    !payload.addressLine2.trim() &&
    !payload.stateId &&
    !payload.districtId &&
    !payload.cityId &&
    !payload.pincodeId
  )
    return [];
  return [
    {
      addressLine1: payload.addressLine1.trim(),
      addressLine2: payload.addressLine2.trim(),
      addressTypeId: nullableNumericId(payload.addressTypeId),
      addressTypeName: payload.addressTypeName.trim() || "Billing",
      cityId: nullableNumericId(payload.cityId),
      cityName: payload.cityName || null,
      countryId: nullableNumericId(payload.countryId),
      countryName: payload.countryName || "India",
      districtId: nullableNumericId(payload.districtId),
      districtName: payload.districtName || null,
      isDefault: true,
      pincodeId: nullableNumericId(payload.pincodeId),
      pincodeName: payload.pincodeName || null,
      stateId: nullableNumericId(payload.stateId),
      stateName: payload.stateName || null
    }
  ];
}

function normalizeLocationRecord(record: ReceiptLocationRecord): ReceiptLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}
function normalizeLookupRecord(record: ReceiptLookupRecord): ReceiptLookupRecord {
  return { ...record, id: String(record.id) };
}
function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}
function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
