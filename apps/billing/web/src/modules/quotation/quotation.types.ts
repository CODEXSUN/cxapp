export type QuotationStatus = "draft" | "confirmed" | "cancelled";
export type QuotationTaxType = "cgst-sgst" | "igst";

export type QuotationContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
};

export type QuotationLineItemInput = {
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

export type QuotationLineItem = QuotationLineItemInput & {
  cgstAmount: number;
  id: string;
  igstAmount: number;
  lineNumber: number;
  lineTotal: number;
  sgstAmount: number;
  taxableAmount: number;
  taxAmount: number;
};

export type QuotationAddressDetails = {
  addressLine1: string;
  addressLine2: string;
  cityName: string;
  districtName: string;
  pincodeName: string;
  stateCode: string;
  stateName: string;
};

export type Quotation = {
  amount: number;
  billingAddress: string;
  billingAddressDetails: QuotationAddressDetails;
  billingAddressId: number;
  billingStateCode: string;
  billingStateName: string;
  companyId: number;
  companyName: string;
  createdAt: string;
  currencyCode: string;
  currencyId: number;
  customerEmail: string;
  customerGstin: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  date: string;
  financialYearId: number;
  financialYearName: string;
  generatedSalesInvoiceNo: string;
  id: string;
  items: QuotationLineItem[];
  ledgerId: number | null;
  lineNumber: number;
  notes: string;
  quotationNumber: string;
  roundOff: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressDetails: QuotationAddressDetails;
  shippingAddressId: number;
  shippingStateCode: string;
  shippingStateName: string;
  status: QuotationStatus;
  subtotal: number;
  taxAmount: number;
  taxType: QuotationTaxType;
  terms: string;
  updatedAt: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type QuotationSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode?: string;
  currencyId: number;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  date: string;
  financialYearId: number;
  items: QuotationLineItemInput[];
  ledgerId: number | null;
  notes: string;
  quotationNumber: string;
  roundOff?: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: QuotationStatus;
  taxType: QuotationTaxType;
  terms: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type QuotationView =
  | { mode: "list" }
  | { mode: "show"; quotation: Quotation }
  | { mode: "upsert"; quotation: Quotation | null; returnTo: "list" | "show" };

export function createEmptyQuotation(): QuotationSavePayload {
  return {
    billingAddress: "",
    billingAddressId: 0,
    companyId: 0,
    currencyCode: "INR",
    currencyId: 0,
    customerEmail: "",
    customerId: 0,
    customerName: "",
    customerPhone: "",
    date: new Date().toISOString().slice(0, 10),
    financialYearId: 0,
    items: [],
    ledgerId: null,
    notes: "",
    quotationNumber: "",
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

export function createEmptyQuotationItem(): QuotationLineItemInput {
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

export type QuotationPageResult = {
  items: Quotation[];
  page: number;
  pageSize: number;
  total: number;
};
