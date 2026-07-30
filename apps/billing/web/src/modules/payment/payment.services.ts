import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import type {
  Payment,
  PaymentActivity,
  PaymentAllocationCandidate,
  PaymentContext,
  PaymentContactSavePayload,
  PaymentLocationKind,
  PaymentLocationRecord,
  PaymentLookupOption,
  PaymentLookupRecord,
  PaymentSavePayload
} from "./payment.types";

export const listPayments = () => billingApiGet<Payment[]>("/billing/payments");
export const listPaymentsPage = (query: {
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
  return billingApiGet<import("./payment.types").PaymentPageResult>(
    `/billing/payments/page?${params}`
  );
};
export const getPaymentContext = () => billingApiGet<PaymentContext>("/billing/payments/context");
export const getPayment = (id: string) => billingApiGet<Payment>(`/billing/payments/${id}`);
export const listPaymentActivity = (id: string) =>
  billingApiGet<PaymentActivity[]>(`/billing/payments/${id}/activity`);
export const createPayment = (input: PaymentSavePayload) =>
  billingApiPost<Payment>("/billing/payments", input);
export const updatePayment = (id: string, input: PaymentSavePayload) =>
  billingApiPut<Payment>(`/billing/payments/${id}`, input);
export const postPayment = (id: string) => billingApiPost<Payment>(`/billing/payments/${id}/post`);
export const cancelPayment = (id: string) =>
  billingApiPost<Payment>(`/billing/payments/${id}/cancel`);
export const deletePayment = (id: string) => billingApiDelete<Payment>(`/billing/payments/${id}`);
export const listPaymentAllocations = (supplierId: number) =>
  supplierId > 0
    ? billingApiGet<PaymentAllocationCandidate[]>(
        `/billing/payments/allocations?supplierId=${supplierId}`
      )
    : Promise.resolve([]);
export const listPaymentContacts = () =>
  billingApiGet<PaymentLookupRecord[]>("/billing/payments/lookups/contacts").then((rows) =>
    options(rows, "contact")
  );
export const listPaymentContactTypes = () =>
  billingApiGet<PaymentLookupRecord[]>("/billing/payments/lookups/contact-types").then((rows) =>
    options(rows, "contact")
  );
export const createPaymentContact = (payload: PaymentContactSavePayload) =>
  billingApiPost<PaymentLookupRecord>("/billing/payments/lookups/contacts", {
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
export const listPaymentLocations = (
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) =>
  billingApiGet<PaymentLocationRecord[]>(paymentLocationListPaths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
export const createPaymentLocation = (
  kind: PaymentLocationKind,
  payload: Record<string, unknown>
) =>
  billingApiPost<PaymentLocationRecord>(paymentLocationCreatePaths[kind], payload).then(
    normalizeLocationRecord
  );
export const listPaymentAddressTypes = () =>
  billingApiGet<PaymentLookupRecord[]>("/billing/payments/lookups/address-types").then((records) =>
    records.map(normalizeLookupRecord)
  );
export const createPaymentAddressType = (name: string) =>
  billingApiPost<PaymentLookupRecord>("/billing/payments/lookups/address-types", {
    isActive: true,
    name: name.trim()
  }).then(normalizeLookupRecord);
export const listPaymentLedgers = () =>
  billingApiGet<PaymentLookupRecord[]>("/billing/payments/lookups/ledgers").then((rows) =>
    options(rows, "ledger")
  );
export function formatPaymentMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value);
}
export function formatPaymentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date
      );
}

const paymentLocationListPaths = {
  cities: "/billing/payments/lookups/cities",
  countries: "/billing/payments/lookups/countries",
  districts: "/billing/payments/lookups/districts",
  pincodes: "/billing/payments/lookups/pincodes",
  states: "/billing/payments/lookups/states"
} as const;

const paymentLocationCreatePaths = {
  cities: "/billing/payments/lookups/cities",
  districts: "/billing/payments/lookups/districts",
  pincodes: "/billing/payments/lookups/pincodes",
  states: "/billing/payments/lookups/states"
} as const;

function options(rows: PaymentLookupRecord[], kind: "contact" | "ledger"): PaymentLookupOption[] {
  return rows
    .filter((row) => row.isActive !== false)
    .map((record) => {
      const value = String(record.id);
      return {
        description:
          kind === "contact" ? record.primaryPhone || record.primaryEmail || "" : record.code || "",
        label: String(record.name || record.code || value),
        record: { ...record, id: value },
        value
      };
    });
}

function contactAddresses(payload: PaymentContactSavePayload) {
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

function normalizeLocationRecord(record: PaymentLocationRecord): PaymentLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}
function normalizeLookupRecord(record: PaymentLookupRecord): PaymentLookupRecord {
  return { ...record, id: String(record.id) };
}
function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}
function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
