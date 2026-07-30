export type PurchaseStatus = "draft" | "confirmed" | "cancelled";
export type PurchaseTaxType = "cgst-sgst" | "igst";

export type PurchaseEwayDetails = {
  billDate: string;
  billNo: string;
  transport: string;
  vehicleNo: string;
};

export type PurchaseEinvoiceDetails = {
  ackDate: string;
  ackNo: string;
  irn: string;
  signedQr: string;
};

export type PurchaseContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  einvoice: PurchaseEinvoiceDetails;
  eway: PurchaseEwayDetails;
  financialYearId: number;
  financialYearName: string;
};

export type PurchaseLineItemInput = {
  colour: string;
  colourId: number | null;
  dcNo: string;
  description: string;
  hsnCode: string;
  hsnCodeId: number | null;
  poNo: string;
  productId: number | null;
  productName: string;
  quantity: number;
  rate: number;
  size: string;
  sizeId: number | null;
  taxId: number | null;
  taxRate: number;
  unit: string;
  unitId: number;
};

export type PurchaseLineItem = PurchaseLineItemInput & {
  cgstAmount: number;
  id: string;
  igstAmount: number;
  lineNumber: number;
  lineTotal: number;
  sgstAmount: number;
  taxableAmount: number;
  taxAmount: number;
};

export type Purchase = {
  amount: number;
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  currencyCode: string;
  currencyId: number;
  einvoice: PurchaseEinvoiceDetails;
  eway: PurchaseEwayDetails;
  supplierEmail: string;
  supplierId: number;
  supplierName: string;
  supplierPhone: string;
  supplierBillDate: string;
  supplierBillNo: string;
  issuedOn: string;
  financialYearId: number;
  financialYearName: string;
  generatedSalesInvoiceNo: string;
  id: string;
  items: PurchaseLineItem[];
  ledgerId: number | null;
  lineNumber: number;
  notes: string;
  invoiceNumber: string;
  roundOff: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: PurchaseStatus;
  subtotal: number;
  taxAmount: number;
  taxType: PurchaseTaxType;
  terms: string;
  updatedAt: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type PurchaseSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode?: string;
  currencyId: number;
  einvoice: PurchaseEinvoiceDetails;
  eway: PurchaseEwayDetails;
  supplierEmail: string;
  supplierId: number;
  supplierName: string;
  supplierPhone: string;
  supplierBillDate?: string;
  supplierBillNo?: string;
  issuedOn: string;
  financialYearId: number;
  items: PurchaseLineItemInput[];
  ledgerId: number | null;
  notes: string;
  invoiceNumber: string;
  roundOff?: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: PurchaseStatus;
  taxType: PurchaseTaxType;
  terms: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type PurchaseView =
  | { mode: "list" }
  | { mode: "show"; purchase: Purchase }
  | { mode: "upsert"; purchase: Purchase | null; returnTo: "list" | "show" };

export function createEmptyPurchase(): PurchaseSavePayload {
  return {
    billingAddress: "",
    billingAddressId: 0,
    companyId: 0,
    currencyCode: "INR",
    currencyId: 0,
    einvoice: { ackDate: "", ackNo: "", irn: "", signedQr: "" },
    eway: { billDate: "", billNo: "", transport: "", vehicleNo: "" },
    supplierEmail: "",
    supplierId: 0,
    supplierName: "",
    supplierPhone: "",
    supplierBillDate: "",
    supplierBillNo: "",
    issuedOn: new Date().toISOString().slice(0, 10),
    financialYearId: 0,
    items: [],
    ledgerId: null,
    notes: "",
    invoiceNumber: "",
    roundOff: 0,
    salesLedger: "",
    shippingAddress: "",
    shippingAddressId: 0,
    status: "draft",
    taxType: "cgst-sgst",
    terms: "",
    workOrderId: null,
    workOrderNo: ""
  };
}

export function createEmptyPurchaseItem(): PurchaseLineItemInput {
  return {
    colour: "",
    colourId: null,
    dcNo: "",
    description: "",
    hsnCode: "",
    hsnCodeId: null,
    poNo: "",
    productId: null,
    productName: "",
    quantity: 1,
    rate: 0,
    size: "",
    sizeId: null,
    taxId: null,
    taxRate: 18,
    unit: "Nos",
    unitId: 0
  };
}

export type PurchasePageResult = {
  items: Purchase[];
  page: number;
  pageSize: number;
  total: number;
};
