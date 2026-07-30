import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import {
  createEmptySaleEinvoice,
  createEmptySaleEway,
  type Sale,
  type SaleContext,
  type SalePageResult,
  type SaleSavePayload,
  type SaleStatus
} from "./sales.types";

export type SaleLookupOption = {
  description?: string;
  label: string;
  meta?: string;
  record?: SaleLookupRecord;
  value: string;
};

export type SaleLookupRecord = {
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

export type SaleContactSavePayload = {
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
export type SaleContactAddressSavePayload = Omit<
  SaleContactSavePayload,
  "gstin" | "legalName" | "name" | "primaryEmail" | "primaryPhone" | "typeId" | "typeName"
>;

export type SaleLocationKind = "cities" | "districts" | "pincodes" | "states";

export type SaleLocationRecord = {
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

export type SaleMasterSavePayload = {
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

export type SaleTransportSavePayload = {
  address: string;
  contactNo: string;
  contactPerson: string;
  gst: string;
  name: string;
  vehicleNo: string;
};

export async function listSales() {
  return billingApiGet<Sale[]>("/billing/sales").then((records) => records.map(fromApiSale));
}

export async function listSalesPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search,
    status: query.status
  });
  return billingApiGet<SalePageResult>(`/billing/sales/page?${params}`).then((result) => ({
    ...result,
    items: result.items.map(fromApiSale)
  }));
}

export async function getSale(id: string) {
  return billingApiGet<Sale>(`/billing/sales/${id}`).then(fromApiSale);
}

export function getSaleContext() {
  return billingApiGet<SaleContext>("/billing/sales/context");
}

export async function createSale(payload: SaleSavePayload) {
  return billingApiPost<Sale>("/billing/sales", toApiPayload(payload)).then(fromApiSale);
}

export async function updateSale(id: string, payload: SaleSavePayload) {
  return billingApiPut<Sale>(`/billing/sales/${id}`, toApiPayload(payload)).then(fromApiSale);
}

export async function deleteSale(id: string) {
  return billingApiDelete<Sale>(`/billing/sales/${id}`);
}

export async function setSaleStatus(id: string, status: Exclude<SaleStatus, "draft">) {
  return billingApiPost<Sale>(
    `/billing/sales/${id}/${status === "confirmed" ? "confirm" : "cancel"}`
  ).then(fromApiSale);
}

export async function revokeSale(id: string) {
  return billingApiPost<Sale>(`/billing/sales/${id}/revoke`).then(fromApiSale);
}

export async function generateSaleEinvoice(id: string, einvoice?: Sale["einvoice"]) {
  return billingApiPost<Sale>(`/billing/sales/${id}/einvoice/generate`, { einvoice }).then(
    fromApiSale
  );
}

export async function generateSaleEway(id: string, eway?: Sale["eway"]) {
  return billingApiPost<Sale>(`/billing/sales/${id}/eway/generate`, { eway }).then(fromApiSale);
}

export function createSaleContact(payload: SaleContactSavePayload) {
  return billingApiPost<SaleLookupRecord>(
    "/billing/sales/lookups/contacts",
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateSaleContact(id: string, payload: SaleContactSavePayload) {
  return billingApiPut<SaleLookupRecord>(
    `/billing/sales/lookups/contacts/${id}`,
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updateSaleContactAddress(
  contactId: string,
  addressId: number,
  payload: SaleContactAddressSavePayload
) {
  return billingApiPut<SaleLookupRecord>(
    `/billing/sales/lookups/contacts/${contactId}/addresses/${addressId}`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function createSaleContactAddress(
  contactId: string,
  payload: SaleContactAddressSavePayload
) {
  return billingApiPost<SaleLookupRecord>(
    `/billing/sales/lookups/contacts/${contactId}/addresses`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function listSaleContactTypes() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/contact-types").then((records) =>
    records.map(normalizeLookupRecord)
  );
}

export function listSaleLocations(
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) {
  const paths = {
    cities: "/billing/sales/lookups/cities",
    countries: "/billing/sales/lookups/countries",
    districts: "/billing/sales/lookups/districts",
    pincodes: "/billing/sales/lookups/pincodes",
    states: "/billing/sales/lookups/states"
  } as const;
  return billingApiGet<SaleLocationRecord[]>(paths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
}

export function createSaleLocation(kind: SaleLocationKind, payload: Record<string, unknown>) {
  const paths = {
    cities: "/billing/sales/lookups/cities",
    districts: "/billing/sales/lookups/districts",
    pincodes: "/billing/sales/lookups/pincodes",
    states: "/billing/sales/lookups/states"
  } as const;
  return billingApiPost<SaleLocationRecord>(paths[kind], payload).then(normalizeLocationRecord);
}

export function listSaleAddressTypes() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/address-types");
}

export function createSaleAddressType(name: string) {
  return billingApiPost<SaleLookupRecord>("/billing/sales/lookups/address-types", {
    isActive: true,
    name: name.trim()
  });
}

export function createSaleLookup(
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
    colours: "/billing/sales/lookups/colours",
    hsnCodes: "/billing/sales/lookups/hsn-codes",
    productCategories: "/billing/sales/lookups/product-categories",
    products: "/billing/sales/lookups/products",
    sizes: "/billing/sales/lookups/sizes",
    taxes: "/billing/sales/lookups/taxes",
    transports: "/billing/sales/lookups/transports",
    units: "/billing/sales/lookups/units",
    workOrders: "/billing/sales/lookups/work-orders"
  } as const;
  return billingApiPost<SaleLookupRecord>(paths[kind], payload);
}

export function listSaleProductCategories() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/product-categories");
}

export function listSaleHsnCodes() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/hsn-codes");
}

export function listSaleUnits() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/units");
}

export function listSaleTaxes() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/taxes");
}

export function updateSaleLookup(
  kind: "products" | "workOrders",
  id: string,
  payload: Record<string, unknown>
) {
  return billingApiPut<SaleLookupRecord>(
    kind === "products"
      ? `/billing/sales/lookups/products/${id}`
      : `/billing/sales/lookups/work-orders/${id}`,
    payload
  );
}

export function listSaleContacts() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/contacts").then((records) =>
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

export function listSaleWorkOrders() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/work-orders").then((records) =>
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

export function listSaleProducts() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/products").then((records) =>
    records.filter(isActiveRecord).map((record) =>
      lookupOption(record, {
        label: record.name || record.code || record.id,
        value: record.name || record.code || record.id
      })
    )
  );
}

export function listSaleColours() {
  return listSaleCommonOptions("colours");
}

export function listSaleSizes() {
  return listSaleCommonOptions("sizes");
}

export function listSaleTransports() {
  return billingApiGet<SaleLookupRecord[]>("/billing/sales/lookups/transports").then((records) =>
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

export function createSaleTransport(payload: SaleTransportSavePayload) {
  return createSaleLookup("transports", { ...payload, isActive: true });
}

export function saleToPayload(sale: Sale): SaleSavePayload {
  return {
    billingAddress: sale.billingAddress,
    billingAddressId: sale.billingAddressId,
    companyId: sale.companyId,
    currencyCode: sale.currencyCode,
    currencyId: sale.currencyId,
    customerEmail: sale.customerEmail,
    customerId: sale.customerId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    einvoice: sale.einvoice ?? createEmptySaleEinvoice(),
    issuedOn: sale.issuedOn,
    financialYearId: sale.financialYearId,
    items: sale.items.map((item) => ({
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
    notes: sale.notes,
    ledgerId: sale.ledgerId,
    saleNumber: sale.saleNumber || sale.invoiceNumber,
    roundOff: sale.roundOff,
    salesLedger: sale.salesLedger,
    shippingAddress: sale.shippingAddress,
    shippingAddressId: sale.shippingAddressId,
    status: sale.status,
    taxType: sale.taxType,
    terms: sale.terms,
    workOrderId: sale.workOrderId,
    workOrderNo: sale.workOrderNo,
    eway: sale.eway ?? createEmptySaleEway()
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

export function totalSaleQuantity(sale: Sale) {
  return sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function listSaleCommonOptions(kind: "colours" | "sizes") {
  return billingApiGet<SaleLookupRecord[]>(`/billing/sales/lookups/${kind}`).then((records) =>
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
  record: SaleLookupRecord,
  option: Omit<SaleLookupOption, "record">
): SaleLookupOption {
  return {
    ...option,
    record
  };
}

function isActiveRecord(record: SaleLookupRecord) {
  return record.isActive !== false;
}

function toApiPayload(payload: SaleSavePayload) {
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
    invoiceNumber: payload.invoiceNumber || payload.saleNumber || "",
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

function fromApiSale(record: Sale): Sale {
  const invoiceNumber = record.invoiceNumber || record.saleNumber || "";
  return {
    ...record,
    currencyCode: record.currencyCode || "INR",
    customerEmail: record.customerEmail || "",
    customerPhone: record.customerPhone || "",
    einvoice: record.einvoice ?? createEmptySaleEinvoice(),
    invoiceNumber,
    numberingWarning: record.numberingWarning || "",
    saleNumber: record.saleNumber || invoiceNumber,
    salesLedger: record.salesLedger || "",
    taxType: record.taxType || "cgst-sgst",
    terms: record.terms || "",
    workOrderNo: record.workOrderNo || "",
    eway: record.eway ?? createEmptySaleEway()
  };
}

function contactPayload(payload: SaleContactSavePayload) {
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

function contactAddressPayload(payload: SaleContactAddressSavePayload) {
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

function normalizeLocationRecord(record: SaleLocationRecord): SaleLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}

function normalizeLookupRecord(record: SaleLookupRecord): SaleLookupRecord {
  return { ...record, id: String(record.id) };
}

function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
