import {
  billingApiDelete,
  billingApiGet,
  billingApiPost,
  billingApiPut
} from "../../shared/api/billing-api";
import {
  type Purchase,
  type PurchaseContext,
  type PurchaseSavePayload,
  type PurchaseStatus
} from "./purchase.types";

export type PurchaseLookupOption = {
  description?: string;
  label: string;
  meta?: string;
  record?: PurchaseLookupRecord;
  value: string;
};

export type PurchaseLookupRecord = {
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

export type PurchaseContactSavePayload = {
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
export type PurchaseContactAddressSavePayload = Omit<
  PurchaseContactSavePayload,
  "gstin" | "legalName" | "name" | "primaryEmail" | "primaryPhone" | "typeId" | "typeName"
>;

export type PurchaseLocationKind = "cities" | "districts" | "pincodes" | "states";

export type PurchaseLocationRecord = {
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

export type PurchaseMasterSavePayload = {
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

export async function listPurchases() {
  return billingApiGet<Purchase[]>("/billing/purchases").then((records) =>
    records.map(fromApiPurchase)
  );
}
export async function listPurchasesPage(query: {
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
  return billingApiGet<import("./purchase.types").PurchasePageResult>(
    `/billing/purchases/page?${params}`
  ).then((result) => ({ ...result, items: result.items.map(fromApiPurchase) }));
}

export async function getPurchase(id: string) {
  return billingApiGet<Purchase>(`/billing/purchases/${id}`).then(fromApiPurchase);
}

export function getPurchaseContext() {
  return billingApiGet<PurchaseContext>("/billing/purchases/context");
}

export async function createPurchase(payload: PurchaseSavePayload) {
  return billingApiPost<Purchase>("/billing/purchases", toApiPayload(payload)).then(
    fromApiPurchase
  );
}

export async function updatePurchase(id: string, payload: PurchaseSavePayload) {
  return billingApiPut<Purchase>(`/billing/purchases/${id}`, toApiPayload(payload)).then(
    fromApiPurchase
  );
}

export async function deletePurchase(id: string) {
  return billingApiDelete<Purchase>(`/billing/purchases/${id}`);
}

export async function setPurchaseStatus(id: string, status: Exclude<PurchaseStatus, "draft">) {
  return billingApiPost<Purchase>(
    `/billing/purchases/${id}/${status === "confirmed" ? "confirm" : "cancel"}`
  ).then(fromApiPurchase);
}

export async function revokePurchase(id: string) {
  return billingApiPost<Purchase>(`/billing/purchases/${id}/revoke`).then(fromApiPurchase);
}

export function convertPurchaseToSale(id: string) {
  return billingApiPost<{ purchase: Purchase; sale: { invoiceNumber: string } }>(
    `/billing/purchases/${id}/convert-to-sale`
  );
}

export function convertPurchasesToSale(purchaseIds: string[]) {
  return billingApiPost<{ purchases: Purchase[]; sale: { invoiceNumber: string } }>(
    "/billing/purchases/convert-to-sale",
    { purchaseIds }
  );
}

export function createPurchaseContact(payload: PurchaseContactSavePayload) {
  return billingApiPost<PurchaseLookupRecord>(
    "/billing/purchases/lookups/contacts",
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updatePurchaseContact(id: string, payload: PurchaseContactSavePayload) {
  return billingApiPut<PurchaseLookupRecord>(
    `/billing/purchases/lookups/contacts/${id}`,
    contactPayload(payload)
  ).then(normalizeLookupRecord);
}

export function updatePurchaseContactAddress(
  contactId: string,
  addressId: number,
  payload: PurchaseContactAddressSavePayload
) {
  return billingApiPut<PurchaseLookupRecord>(
    `/billing/purchases/lookups/contacts/${contactId}/addresses/${addressId}`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function createPurchaseContactAddress(
  contactId: string,
  payload: PurchaseContactAddressSavePayload
) {
  return billingApiPost<PurchaseLookupRecord>(
    `/billing/purchases/lookups/contacts/${contactId}/addresses`,
    contactAddressPayload(payload)
  ).then(normalizeLookupRecord);
}

export function listPurchaseContactTypes() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/contact-types").then(
    (records) => records.map(normalizeLookupRecord)
  );
}

export function listPurchaseLocations(
  kind: "cities" | "countries" | "districts" | "pincodes" | "states"
) {
  const paths = {
    cities: "/billing/purchases/lookups/cities",
    countries: "/billing/purchases/lookups/countries",
    districts: "/billing/purchases/lookups/districts",
    pincodes: "/billing/purchases/lookups/pincodes",
    states: "/billing/purchases/lookups/states"
  } as const;
  return billingApiGet<PurchaseLocationRecord[]>(paths[kind]).then((records) =>
    records.map(normalizeLocationRecord)
  );
}

export function createPurchaseLocation(
  kind: PurchaseLocationKind,
  payload: Record<string, unknown>
) {
  const paths = {
    cities: "/billing/purchases/lookups/cities",
    districts: "/billing/purchases/lookups/districts",
    pincodes: "/billing/purchases/lookups/pincodes",
    states: "/billing/purchases/lookups/states"
  } as const;
  return billingApiPost<PurchaseLocationRecord>(paths[kind], payload).then(normalizeLocationRecord);
}

export function listPurchaseAddressTypes() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/address-types");
}

export function createPurchaseAddressType(name: string) {
  return billingApiPost<PurchaseLookupRecord>("/billing/purchases/lookups/address-types", {
    isActive: true,
    name: name.trim()
  });
}

export function createPurchaseLookup(
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
    colours: "/billing/purchases/lookups/colours",
    hsnCodes: "/billing/purchases/lookups/hsn-codes",
    productCategories: "/billing/purchases/lookups/product-categories",
    products: "/billing/purchases/lookups/products",
    sizes: "/billing/purchases/lookups/sizes",
    taxes: "/billing/purchases/lookups/taxes",
    units: "/billing/purchases/lookups/units",
    workOrders: "/billing/purchases/lookups/work-orders"
  } as const;
  return billingApiPost<PurchaseLookupRecord>(paths[kind], payload);
}

export function listPurchaseProductCategories() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/product-categories");
}

export function listPurchaseHsnCodes() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/hsn-codes");
}

export function listPurchaseUnits() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/units");
}

export function listPurchaseTaxes() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/taxes");
}

export function updatePurchaseLookup(
  kind: "products" | "workOrders",
  id: string,
  payload: Record<string, unknown>
) {
  return billingApiPut<PurchaseLookupRecord>(
    kind === "products"
      ? `/billing/purchases/lookups/products/${id}`
      : `/billing/purchases/lookups/work-orders/${id}`,
    payload
  );
}

export function listPurchaseContacts() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/contacts").then(
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

export function listPurchaseWorkOrders() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/work-orders").then(
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

export function listPurchaseProducts() {
  return billingApiGet<PurchaseLookupRecord[]>("/billing/purchases/lookups/products").then(
    (records) =>
      records.filter(isActiveRecord).map((record) =>
        lookupOption(record, {
          label: record.name || record.code || record.id,
          value: record.name || record.code || record.id
        })
      )
  );
}

export function listPurchaseColours() {
  return listPurchaseCommonOptions("colours");
}

export function listPurchaseSizes() {
  return listPurchaseCommonOptions("sizes");
}

export function purchaseToPayload(purchase: Purchase): PurchaseSavePayload {
  return {
    billingAddress: purchase.billingAddress,
    billingAddressId: purchase.billingAddressId,
    companyId: purchase.companyId,
    currencyCode: purchase.currencyCode,
    currencyId: purchase.currencyId,
    einvoice: purchase.einvoice,
    eway: purchase.eway,
    supplierEmail: purchase.supplierEmail,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    supplierPhone: purchase.supplierPhone,
    supplierBillDate: purchase.supplierBillDate,
    supplierBillNo: purchase.supplierBillNo,
    issuedOn: purchase.issuedOn,
    financialYearId: purchase.financialYearId,
    items: purchase.items.map((item) => ({
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
    notes: purchase.notes,
    ledgerId: purchase.ledgerId,
    invoiceNumber: purchase.invoiceNumber,
    roundOff: purchase.roundOff,
    salesLedger: purchase.salesLedger,
    shippingAddress: purchase.shippingAddress,
    shippingAddressId: purchase.shippingAddressId,
    status: purchase.status,
    taxType: purchase.taxType,
    terms: purchase.terms,
    workOrderId: purchase.workOrderId,
    workOrderNo: purchase.workOrderNo
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
  const issuedOn = new Date(value);
  if (Number.isNaN(issuedOn.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(issuedOn);
}

export function totalPurchaseQuantity(purchase: Purchase) {
  return purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function listPurchaseCommonOptions(kind: "colours" | "sizes") {
  return billingApiGet<PurchaseLookupRecord[]>(`/billing/purchases/lookups/${kind}`).then(
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
  record: PurchaseLookupRecord,
  option: Omit<PurchaseLookupOption, "record">
): PurchaseLookupOption {
  return {
    ...option,
    record
  };
}

function isActiveRecord(record: PurchaseLookupRecord) {
  return record.isActive !== false;
}

function toApiPayload(payload: PurchaseSavePayload) {
  return {
    billingAddress: payload.billingAddress,
    billingAddressId: payload.billingAddressId,
    companyId: payload.companyId,
    currencyCode: payload.currencyCode || "INR",
    currencyId: payload.currencyId,
    einvoice: payload.einvoice,
    eway: payload.eway,
    supplierEmail: payload.supplierEmail,
    supplierId: payload.supplierId,
    supplierName: payload.supplierName,
    supplierPhone: payload.supplierPhone,
    supplierBillDate: payload.supplierBillDate,
    supplierBillNo: payload.supplierBillNo,
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
    workOrderNo: payload.workOrderNo
  };
}

function fromApiPurchase(record: Purchase): Purchase {
  return {
    ...record,
    currencyCode: record.currencyCode || "INR",
    einvoice: record.einvoice ?? { ackDate: "", ackNo: "", irn: "", signedQr: "" },
    eway: record.eway ?? { billDate: "", billNo: "", transport: "", vehicleNo: "" },
    supplierEmail: record.supplierEmail || "",
    supplierPhone: record.supplierPhone || "",
    supplierBillDate: record.supplierBillDate || "",
    supplierBillNo: record.supplierBillNo || "",
    invoiceNumber: record.invoiceNumber || "",
    salesLedger: record.salesLedger || "",
    taxType: record.taxType || "cgst-sgst",
    terms: record.terms || "",
    workOrderNo: record.workOrderNo || ""
  };
}

function contactPayload(payload: PurchaseContactSavePayload) {
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

function contactAddressPayload(payload: PurchaseContactAddressSavePayload) {
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

function normalizeLocationRecord(record: PurchaseLocationRecord): PurchaseLocationRecord {
  return {
    ...record,
    cityId: nullableStringId(record.cityId),
    countryId: nullableStringId(record.countryId),
    districtId: nullableStringId(record.districtId),
    id: String(record.id),
    stateId: nullableStringId(record.stateId)
  };
}

function normalizeLookupRecord(record: PurchaseLookupRecord): PurchaseLookupRecord {
  return { ...record, id: String(record.id) };
}

function nullableNumericId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function nullableStringId(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}
