import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import {
  type Quotation,
  type QuotationContext,
  type QuotationSavePayload,
  type QuotationStatus
} from "./quotation.types";

export type QuotationLookupOption = {
  description?: string;
  label: string;
  meta?: string;
  record?: QuotationLookupRecord;
  value: string;
};

export type QuotationLookupRecord = {
  addresses?: Array<Record<string, unknown>>;
  code?: string | null;
  description?: string | null;
  gst?: string | null;
  gstin?: string | null;
  hsnCode?: string | null;
  id: string;
  isActive?: boolean | null;
  legalName?: string | null;
  name?: string | null;
  openingRate?: number | null;
  productCategoryId?: string | null;
  productCategoryName?: string | null;
  price?: number | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  taxName?: string | null;
  taxRate?: number | null;
  ratePercent?: number | null;
  unitId?: string | null;
  hsnCodeId?: string | null;
  taxId?: string | null;
  typeId?: string | null;
  typeName?: string | null;
  unitName?: string | null;
  workOrderNo?: string | null;
};

export type QuotationContactSavePayload = {
  addressTypeId: string;
  addressTypeName: string;
  addressLine1: string;
  addressLine2: string;
  cityId: string;
  cityName: string;
  countryId: string;
  countryName: string;
  districtId: string;
  districtName: string;
  gstin: string;
  legalName: string;
  name: string;
  pincodeId: string;
  pincodeName: string;
  primaryEmail: string;
  primaryPhone: string;
  stateId: string;
  stateName: string;
  typeId: string;
  typeName: string;
};
export type QuotationContactAddressSavePayload = Omit<
  QuotationContactSavePayload,
  "gstin" | "legalName" | "name" | "primaryEmail" | "primaryPhone" | "typeId" | "typeName"
>;

export type QuotationLocationKind = "cities" | "districts" | "pincodes" | "states";

export type QuotationLocationRecord = {
  areaName?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  code: string;
  countryId?: string | null;
  countryName?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  id: string;
  name: string;
  pincode?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  status?: "active" | "inactive";
};

export type QuotationMasterSavePayload = {
  code: string;
  hsnCode: string;
  hsnCodeId?: string;
  name: string;
  openingRate: number;
  productCategoryId?: string;
  productCategoryName?: string;
  taxId?: string;
  taxName?: string;
  taxRate?: number;
  typeName: string;
  unitId?: string;
  unitName: string;
};

export async function listQuotations() {
  return billingApiGet<Quotation[]>("/billing/quotations").then((records) =>
    records.map(fromApiQuotation)
  );
}

export async function listQuotationsPage(query: {
  customer: string;
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams({
    customer: query.customer,
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search,
    status: query.status
  });
  return billingApiGet<import("./quotation.types").QuotationPageResult>(
    `/billing/quotations/page?${params}`
  ).then((result) => ({ ...result, items: result.items.map(fromApiQuotation) }));
}

export async function getQuotation(id: string) {
  return billingApiGet<Quotation>(`/billing/quotations/${id}`).then(fromApiQuotation);
}

export function getQuotationContext() {
  return billingApiGet<QuotationContext>("/billing/quotations/context");
}

export async function createQuotation(payload: QuotationSavePayload) {
  return billingApiPost<Quotation>("/billing/quotations", toApiPayload(payload)).then(
    fromApiQuotation
  );
}

export async function updateQuotation(id: string, payload: QuotationSavePayload) {
  return billingApiPut<Quotation>(`/billing/quotations/${id}`, toApiPayload(payload)).then(
    fromApiQuotation
  );
}

export async function deleteQuotation(id: string) {
  return billingApiDelete<Quotation>(`/billing/quotations/${id}`);
}

export async function setQuotationStatus(id: string, status: Exclude<QuotationStatus, "draft">) {
  return billingApiPost<Quotation>(
    `/billing/quotations/${id}/${status === "confirmed" ? "confirm" : "cancel"}`
  ).then(fromApiQuotation);
}

export async function revokeQuotation(id: string) {
  return billingApiPost<Quotation>(`/billing/quotations/${id}/revoke`).then(fromApiQuotation);
}

export function convertQuotationToSale(id: string) {
  return billingApiPost<{ quotation: Quotation; sale: { invoiceNumber: string } }>(
    `/billing/quotations/${id}/convert-to-sale`
  );
}

export function convertQuotationsToSale(quotationIds: string[]) {
  return billingApiPost<{ quotations: Quotation[]; sale: { invoiceNumber: string } }>(
    "/billing/quotations/convert-to-sale",
    { quotationIds }
  );
}

export function createQuotationContact(payload: QuotationContactSavePayload) {
  return billingApiPost<QuotationLookupRecord>(
    "/billing/quotations/lookups/contacts",
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateQuotationContact(id: string, payload: QuotationContactSavePayload) {
  return billingApiPut<QuotationLookupRecord>(
    `/billing/quotations/lookups/contacts/${id}`,
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateQuotationContactAddress(
  contactId: string,
  addressId: number,
  payload: QuotationContactAddressSavePayload
) {
  return billingApiPut<QuotationLookupRecord>(
    `/billing/quotations/lookups/contacts/${contactId}/addresses/${addressId}`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function createQuotationContactAddress(
  contactId: string,
  payload: QuotationContactAddressSavePayload
) {
  return billingApiPost<QuotationLookupRecord>(
    `/billing/quotations/lookups/contacts/${contactId}/addresses`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function listQuotationContactTypes() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/contact-types").then(
    (records) => records.map(normalizeLookupRecord)
  );
}

export function listQuotationLocations(
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) {
  const paths = {
    cities: "/billing/quotations/lookups/cities",
    countries: "/billing/quotations/lookups/countries",
    districts: "/billing/quotations/lookups/districts",
    pincodes: "/billing/quotations/lookups/pincodes",
    states: "/billing/quotations/lookups/states"
  } as const;
  return billingApiGet<QuotationLocationRecord[]>(paths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
}

export function createQuotationLocation(
  kind: QuotationLocationKind,
  payload: Record<string, unknown>
) {
  const paths = {
    cities: "/billing/quotations/lookups/cities",
    districts: "/billing/quotations/lookups/districts",
    pincodes: "/billing/quotations/lookups/pincodes",
    states: "/billing/quotations/lookups/states"
  } as const;
  return billingApiPost<QuotationLocationRecord>(paths[kind], payload).then(
    normalizeLocationRecord
  );
}

export function listQuotationAddressTypes() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/address-types");
}

export function createQuotationAddressType(name: string) {
  return billingApiPost<QuotationLookupRecord>("/billing/quotations/lookups/address-types", {
    isActive: true,
    name: name.trim()
  });
}

export function createQuotationLookup(
  kind:
    | "colours"
    | "products"
    | "sizes"
    | "workOrders"
    | "productCategories"
    | "hsnCodes"
    | "units"
    | "taxes",
  payload: Record<string, unknown>
) {
  const paths = {
    colours: "/billing/quotations/lookups/colours",
    hsnCodes: "/billing/quotations/lookups/hsn-codes",
    productCategories: "/billing/quotations/lookups/product-categories",
    products: "/billing/quotations/lookups/products",
    sizes: "/billing/quotations/lookups/sizes",
    taxes: "/billing/quotations/lookups/taxes",
    units: "/billing/quotations/lookups/units",
    workOrders: "/billing/quotations/lookups/work-orders"
  } as const;
  return billingApiPost<QuotationLookupRecord>(paths[kind], payload);
}

export function listQuotationProductCategories() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/product-categories");
}

export function listQuotationHsnCodes() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/hsn-codes");
}

export function listQuotationUnits() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/units");
}

export function listQuotationTaxes() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/taxes");
}

export function updateQuotationLookup(
  kind: "products" | "workOrders",
  id: string,
  payload: Record<string, unknown>
) {
  return billingApiPut<QuotationLookupRecord>(
    kind === "products"
      ? `/billing/quotations/lookups/products/${id}`
      : `/billing/quotations/lookups/work-orders/${id}`,
    payload
  );
}

export function listQuotationContacts() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/contacts").then(
    (records) =>
      records.filter(isActiveRecord).map((record) =>
        lookupOption(record, {
          description: record.primaryPhone || record.primaryEmail || "",
          label: record.name || record.code || record.id,
          meta: record.code || "",
          value: record.name || record.code || record.id
        })
      )
  );
}

export function listQuotationWorkOrders() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/work-orders").then(
    (records) =>
      records.filter(isActiveRecord).map((record) => {
        const workOrderNo = record.code || record.workOrderNo || record.name || record.id;
        return lookupOption(record, {
          description: record.name || record.typeName || "",
          label: workOrderNo,
          meta: record.typeName || "",
          value: workOrderNo
        });
      })
  );
}

export function listQuotationProducts() {
  return billingApiGet<QuotationLookupRecord[]>("/billing/quotations/lookups/products").then(
    (records) =>
      records.filter(isActiveRecord).map((record) =>
        lookupOption(record, {
          label: record.name || record.code || record.id,
          value: record.name || record.code || record.id
        })
      )
  );
}

export function listQuotationColours() {
  return listQuotationCommonOptions("colours");
}

export function listQuotationSizes() {
  return listQuotationCommonOptions("sizes");
}

export function quotationToPayload(quotation: Quotation): QuotationSavePayload {
  return {
    billingAddress: quotation.billingAddress,
    billingAddressId: quotation.billingAddressId,
    companyId: quotation.companyId,
    currencyCode: quotation.currencyCode,
    currencyId: quotation.currencyId,
    customerEmail: quotation.customerEmail,
    customerId: quotation.customerId,
    customerName: quotation.customerName,
    customerPhone: quotation.customerPhone,
    date: quotation.date,
    financialYearId: quotation.financialYearId,
    items: quotation.items.map((item) => ({
      colour: item.colour,
      colourId: item.colourId,
      dcNo: item.dcNo,
      description: item.description,
      hsnCode: item.hsnCode,
      hsnCodeId: item.hsnCodeId,
      poNo: item.poNo,
      productName: item.productName,
      productId: item.productId,
      quantity: item.quantity,
      rate: item.rate,
      size: item.size,
      sizeId: item.sizeId,
      taxId: item.taxId,
      taxRate: item.taxRate,
      unit: item.unit,
      unitId: item.unitId
    })),
    notes: quotation.notes,
    ledgerId: quotation.ledgerId,
    quotationNumber: quotation.quotationNumber,
    roundOff: quotation.roundOff,
    salesLedger: quotation.salesLedger,
    shippingAddress: quotation.shippingAddress,
    shippingAddressId: quotation.shippingAddressId,
    status: quotation.status,
    taxType: quotation.taxType,
    terms: quotation.terms,
    workOrderId: quotation.workOrderId,
    workOrderNo: quotation.workOrderNo
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(Number(value ?? 0));
}

export function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function totalQuotationQuantity(quotation: Quotation) {
  return quotation.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function listQuotationCommonOptions(kind: "colours" | "sizes") {
  return billingApiGet<QuotationLookupRecord[]>(`/billing/quotations/lookups/${kind}`).then(
    (records) =>
      records.filter(isActiveRecord).map((record) => {
        const label = record.name || record.code || record.id;
        return lookupOption(record, {
          description: record.description || record.code || "",
          label,
          value: label
        });
      })
  );
}

function lookupOption(
  record: QuotationLookupRecord,
  option: Omit<QuotationLookupOption, "record">
): QuotationLookupOption {
  return {
    ...option,
    record
  };
}

function isActiveRecord(record: QuotationLookupRecord) {
  return record.isActive !== false;
}

function toApiPayload(payload: QuotationSavePayload) {
  return {
    billingAddress: payload.billingAddress,
    billingAddressId: payload.billingAddressId,
    companyId: payload.companyId,
    currencyCode: payload.currencyCode || "INR",
    currencyId: payload.currencyId,
    customerEmail: payload.customerEmail,
    customerId: payload.customerId,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    quotationNumber: payload.quotationNumber,
    financialYearId: payload.financialYearId,
    date: payload.date,
    items: payload.items,
    notes: payload.notes,
    ledgerId: payload.ledgerId,
    roundOff: payload.roundOff,
    salesLedger: payload.salesLedger,
    shippingAddress: payload.shippingAddress,
    shippingAddressId: payload.shippingAddressId,
    status: payload.status,
    taxType: payload.taxType,
    terms: payload.terms,
    workOrderId: payload.workOrderId,
    workOrderNo: payload.workOrderNo
  };
}

function fromApiQuotation(record: Quotation): Quotation {
  return {
    ...record,
    currencyCode: record.currencyCode || "INR",
    customerEmail: record.customerEmail || "",
    customerGstin: record.customerGstin || "",
    customerPhone: record.customerPhone || "",
    billingStateCode: record.billingStateCode || "",
    billingStateName: record.billingStateName || "",
    quotationNumber: record.quotationNumber || "",
    salesLedger: record.salesLedger || "",
    shippingStateCode: record.shippingStateCode || "",
    shippingStateName: record.shippingStateName || "",
    taxType: record.taxType || "cgst-sgst",
    terms: record.terms || "",
    workOrderNo: record.workOrderNo || ""
  };
}

function contactPayload(payload: QuotationContactSavePayload) {
  return {
    addresses:
      payload.addressLine1.trim() ||
      payload.addressLine2.trim() ||
      payload.stateId ||
      payload.districtId ||
      payload.cityId ||
      payload.pincodeId
        ? [
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
          ]
        : [],
    gstin: payload.gstin.trim().toUpperCase(),
    isActive: true,
    legalName: payload.legalName.trim(),
    name: payload.name.trim(),
    emails: payload.primaryEmail.trim()
      ? [
          {
            email: payload.primaryEmail.trim(),
            emailType: "Work",
            isPrimary: true
          }
        ]
      : [],
    phones: payload.primaryPhone.trim()
      ? [
          {
            isPrimary: true,
            phone: payload.primaryPhone.trim(),
            phoneType: "Mobile"
          }
        ]
      : [],
    typeId: Number(payload.typeId)
  };
}

function contactAddressPayload(payload: QuotationContactAddressSavePayload) {
  return {
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
    pincodeId: nullableNumericId(payload.pincodeId),
    pincodeName: payload.pincodeName || null,
    stateId: nullableNumericId(payload.stateId),
    stateName: payload.stateName || null
  };
}

function normalizeLocationRecord(record: QuotationLocationRecord): QuotationLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}

function normalizeLookupRecord(record: QuotationLookupRecord): QuotationLookupRecord {
  return { ...record, id: String(record.id) };
}

function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
