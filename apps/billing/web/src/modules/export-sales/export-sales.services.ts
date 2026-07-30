import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import {
  createEmptyExportSaleEinvoice,
  createEmptyExportSaleEway,
  type ExportSale,
  type ExportSaleContext,
  type ExportSaleSavePayload,
  type ExportSaleStatus
} from "./export-sales.types";

export type ExportSaleLookupOption = {
  description?: string;
  label: string;
  meta?: string;
  record?: ExportSaleLookupRecord;
  value: string;
};

export type ExportSaleLookupRecord = {
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
  vehicleNo?: string | null;
  workOrderNo?: string | null;
};

export type ExportSaleContactSavePayload = {
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
export type ExportSaleContactAddressSavePayload = Omit<
  ExportSaleContactSavePayload,
  "gstin" | "legalName" | "name" | "primaryEmail" | "primaryPhone" | "typeId" | "typeName"
>;

export type ExportSaleLocationKind = "cities" | "districts" | "pincodes" | "states";

export type ExportSaleLocationRecord = {
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

export type ExportSaleMasterSavePayload = {
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

export type ExportSaleTransportSavePayload = {
  address: string;
  contactNo: string;
  contactPerson: string;
  gst: string;
  name: string;
  vehicleNo: string;
};

export async function listExportSales() {
  return billingApiGet<ExportSale[]>("/billing/export-sales").then((records) =>
    records.map(fromApiExportSale)
  );
}
export async function listExportSalesPage(query: {
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
  return billingApiGet<import("./export-sales.types").ExportSalePageResult>(
    `/billing/export-sales/page?${params}`
  ).then((result) => ({ ...result, items: result.items.map(fromApiExportSale) }));
}

export async function getExportSale(id: string) {
  return billingApiGet<ExportSale>(`/billing/export-sales/${id}`).then(fromApiExportSale);
}

export function getExportSaleContext() {
  return billingApiGet<ExportSaleContext>("/billing/export-sales/context");
}

export async function createExportSale(payload: ExportSaleSavePayload) {
  return billingApiPost<ExportSale>("/billing/export-sales", toApiPayload(payload)).then(
    fromApiExportSale
  );
}

export async function updateExportSale(id: string, payload: ExportSaleSavePayload) {
  return billingApiPut<ExportSale>(`/billing/export-sales/${id}`, toApiPayload(payload)).then(
    fromApiExportSale
  );
}

export async function deleteExportSale(id: string) {
  return billingApiDelete<ExportSale>(`/billing/export-sales/${id}`);
}

export async function setExportSaleStatus(id: string, status: Exclude<ExportSaleStatus, "draft">) {
  return billingApiPost<ExportSale>(
    `/billing/export-sales/${id}/${status === "confirmed" ? "confirm" : "cancel"}`
  ).then(fromApiExportSale);
}

export async function revokeExportSale(id: string) {
  return billingApiPost<ExportSale>(`/billing/export-sales/${id}/revoke`).then(fromApiExportSale);
}

export async function generateExportSaleEinvoice(id: string, einvoice?: ExportSale["einvoice"]) {
  return billingApiPost<ExportSale>(`/billing/export-sales/${id}/einvoice/generate`, {
    einvoice
  }).then(fromApiExportSale);
}

export async function generateExportSaleEway(id: string, eway?: ExportSale["eway"]) {
  return billingApiPost<ExportSale>(`/billing/export-sales/${id}/eway/generate`, { eway }).then(
    fromApiExportSale
  );
}

export function createExportSaleContact(payload: ExportSaleContactSavePayload) {
  return billingApiPost<ExportSaleLookupRecord>(
    "/billing/export-sales/lookups/contacts",
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateExportSaleContact(id: string, payload: ExportSaleContactSavePayload) {
  return billingApiPut<ExportSaleLookupRecord>(
    `/billing/export-sales/lookups/contacts/${id}`,
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateExportSaleContactAddress(
  contactId: string,
  addressId: number,
  payload: ExportSaleContactAddressSavePayload
) {
  return billingApiPut<ExportSaleLookupRecord>(
    `/billing/export-sales/lookups/contacts/${contactId}/addresses/${addressId}`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function createExportSaleContactAddress(
  contactId: string,
  payload: ExportSaleContactAddressSavePayload
) {
  return billingApiPost<ExportSaleLookupRecord>(
    `/billing/export-sales/lookups/contacts/${contactId}/addresses`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function listExportSaleContactTypes() {
  return billingApiGet<ExportSaleLookupRecord[]>(
    "/billing/export-sales/lookups/contact-types"
  ).then((records) => records.map(normalizeLookupRecord));
}

export function listExportSaleLocations(
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) {
  const paths = {
    cities: "/billing/export-sales/lookups/cities",
    countries: "/billing/export-sales/lookups/countries",
    districts: "/billing/export-sales/lookups/districts",
    pincodes: "/billing/export-sales/lookups/pincodes",
    states: "/billing/export-sales/lookups/states"
  } as const;
  return billingApiGet<ExportSaleLocationRecord[]>(paths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
}

export function createExportSaleLocation(
  kind: ExportSaleLocationKind,
  payload: Record<string, unknown>
) {
  const paths = {
    cities: "/billing/export-sales/lookups/cities",
    districts: "/billing/export-sales/lookups/districts",
    pincodes: "/billing/export-sales/lookups/pincodes",
    states: "/billing/export-sales/lookups/states"
  } as const;
  return billingApiPost<ExportSaleLocationRecord>(paths[kind], payload).then(
    normalizeLocationRecord
  );
}

export function listExportSaleAddressTypes() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/address-types");
}

export function createExportSaleAddressType(name: string) {
  return billingApiPost<ExportSaleLookupRecord>("/billing/export-sales/lookups/address-types", {
    isActive: true,
    name: name.trim()
  });
}

export function createExportSaleLookup(
  kind:
    | "colours"
    | "products"
    | "sizes"
    | "workOrders"
    | "productCategories"
    | "hsnCodes"
    | "units"
    | "taxes"
    | "transports",
  payload: Record<string, unknown>
) {
  const paths = {
    colours: "/billing/export-sales/lookups/colours",
    hsnCodes: "/billing/export-sales/lookups/hsn-codes",
    productCategories: "/billing/export-sales/lookups/product-categories",
    products: "/billing/export-sales/lookups/products",
    sizes: "/billing/export-sales/lookups/sizes",
    taxes: "/billing/export-sales/lookups/taxes",
    transports: "/billing/export-sales/lookups/transports",
    units: "/billing/export-sales/lookups/units",
    workOrders: "/billing/export-sales/lookups/work-orders"
  } as const;
  return billingApiPost<ExportSaleLookupRecord>(paths[kind], payload);
}

export function listExportSaleProductCategories() {
  return billingApiGet<ExportSaleLookupRecord[]>(
    "/billing/export-sales/lookups/product-categories"
  );
}

export function listExportSaleHsnCodes() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/hsn-codes");
}

export function listExportSaleUnits() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/units");
}

export function listExportSaleTaxes() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/taxes");
}

export function updateExportSaleLookup(
  kind: "products" | "workOrders",
  id: string,
  payload: Record<string, unknown>
) {
  return billingApiPut<ExportSaleLookupRecord>(
    kind === "products"
      ? `/billing/export-sales/lookups/products/${id}`
      : `/billing/export-sales/lookups/work-orders/${id}`,
    payload
  );
}

export function listExportSaleContacts() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/contacts").then(
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

export function listExportSaleWorkOrders() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/work-orders").then(
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

export function listExportSaleProducts() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/products").then(
    (records) =>
      records.filter(isActiveRecord).map((record) =>
        lookupOption(record, {
          label: record.name || record.code || record.id,
          value: record.name || record.code || record.id
        })
      )
  );
}

export function listExportSaleColours() {
  return listExportSaleCommonOptions("colours");
}

export function listExportSaleSizes() {
  return listExportSaleCommonOptions("sizes");
}

export function listExportSaleTransports() {
  return billingApiGet<ExportSaleLookupRecord[]>("/billing/export-sales/lookups/transports").then(
    (records) =>
      records.filter(isActiveRecord).map((record) =>
        lookupOption(record, {
          description: record.gst || record.vehicleNo || "",
          label: record.name || record.code || record.id,
          meta: record.gst || "",
          value: record.name || record.code || record.id
        })
      )
  );
}

export function createExportSaleTransport(payload: ExportSaleTransportSavePayload) {
  return createExportSaleLookup("transports", { ...payload, isActive: true });
}

export function exportSaleToPayload(exportSale: ExportSale): ExportSaleSavePayload {
  return {
    billingAddress: exportSale.billingAddress,
    billingAddressId: exportSale.billingAddressId,
    companyId: exportSale.companyId,
    currencyCode: exportSale.currencyCode,
    currencyId: exportSale.currencyId,
    customerEmail: exportSale.customerEmail,
    customerId: exportSale.customerId,
    customerName: exportSale.customerName,
    customerPhone: exportSale.customerPhone,
    einvoice: exportSale.einvoice ?? createEmptyExportSaleEinvoice(),
    issuedOn: exportSale.issuedOn,
    financialYearId: exportSale.financialYearId,
    items: exportSale.items.map((item) => ({
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
    notes: exportSale.notes,
    ledgerId: exportSale.ledgerId,
    invoiceNumber: exportSale.invoiceNumber,
    roundOff: exportSale.roundOff,
    salesLedger: exportSale.salesLedger,
    shippingAddress: exportSale.shippingAddress,
    shippingAddressId: exportSale.shippingAddressId,
    status: exportSale.status,
    taxType: exportSale.taxType,
    terms: exportSale.terms,
    workOrderId: exportSale.workOrderId,
    workOrderNo: exportSale.workOrderNo,
    eway: exportSale.eway ?? createEmptyExportSaleEway()
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

export function totalExportSaleQuantity(exportSale: ExportSale) {
  return exportSale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function listExportSaleCommonOptions(kind: "colours" | "sizes") {
  return billingApiGet<ExportSaleLookupRecord[]>(`/billing/export-sales/lookups/${kind}`).then(
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
  record: ExportSaleLookupRecord,
  option: Omit<ExportSaleLookupOption, "record">
): ExportSaleLookupOption {
  return {
    ...option,
    record
  };
}

function isActiveRecord(record: ExportSaleLookupRecord) {
  return record.isActive !== false;
}

function toApiPayload(payload: ExportSaleSavePayload) {
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
    einvoice: payload.einvoice,
    invoiceNumber: payload.invoiceNumber,
    financialYearId: payload.financialYearId,
    issuedOn: payload.issuedOn,
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
    workOrderNo: payload.workOrderNo,
    eway: payload.eway
  };
}

function fromApiExportSale(record: ExportSale): ExportSale {
  return {
    ...record,
    currencyCode: record.currencyCode || "INR",
    customerEmail: record.customerEmail || "",
    customerPhone: record.customerPhone || "",
    einvoice: record.einvoice ?? createEmptyExportSaleEinvoice(),
    invoiceNumber: record.invoiceNumber || "",
    salesLedger: record.salesLedger || "",
    taxType: record.taxType || "cgst-sgst",
    terms: record.terms || "",
    workOrderNo: record.workOrderNo || "",
    eway: record.eway ?? createEmptyExportSaleEway()
  };
}

function contactPayload(payload: ExportSaleContactSavePayload) {
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
      ? [{ email: payload.primaryEmail.trim(), emailType: "Work", isPrimary: true }]
      : [],
    phones: payload.primaryPhone.trim()
      ? [{ isPrimary: true, phone: payload.primaryPhone.trim(), phoneType: "Mobile" }]
      : [],
    typeId: Number(payload.typeId)
  };
}

function contactAddressPayload(payload: ExportSaleContactAddressSavePayload) {
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

function normalizeLocationRecord(record: ExportSaleLocationRecord): ExportSaleLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}

function normalizeLookupRecord(record: ExportSaleLookupRecord): ExportSaleLookupRecord {
  return { ...record, id: String(record.id) };
}

function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
