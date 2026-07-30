export type SaleStatus = "draft" | "confirmed" | "cancelled";
export type SaleTaxType = "cgst-sgst" | "igst";
export type SaleGstDocumentStatus = "not-generated" | "generated";

export type SaleEwayDetails = {
  billDate: string;
  billNo: string;
  notes: string;
  part: "Part A" | "Part B";
  status: SaleGstDocumentStatus;
  transport: string;
  transportGst: string;
  transportId: number | null;
  vehicleNo: string;
};

export type SaleContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
};

export type SaleEinvoiceDetails = {
  ackDate: string;
  ackNo: string;
  irn: string;
  signedQr: string;
  status: SaleGstDocumentStatus;
};

export type SaleLineItemInput = {
  colour: string;
  colourId: number | null;
  dcNo: string;
  description: string;
  hsnCode: string;
  hsnCodeId: number | null;
  poNo: string;
  productName: string;
  productId: number | null;
  quantity: number;
  rate: number;
  size: string;
  sizeId: number | null;
  taxId: number | null;
  taxRate: number;
  unit: string;
  unitId: number;
};

export type SaleLineItem = SaleLineItemInput & {
  cgstAmount: number;
  id: string;
  lineNumber: number;
  igstAmount: number;
  lineTotal: number;
  sgstAmount: number;
  taxableAmount: number;
  taxAmount: number;
};

export type Sale = {
  amount: number;
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice: SaleEinvoiceDetails;
  eway: SaleEwayDetails;
  generatedSalesInvoiceNo?: string;
  id: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
  invoiceNumber: string;
  items: SaleLineItem[];
  issuedOn: string;
  notes: string;
  numberingWarning: string;
  ledgerId: number | null;
  lineNumber: number;
  roundOff: number;
  saleNumber: string;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
  taxType: SaleTaxType;
  terms: string;
  updatedAt: string;
  workOrderNo: string;
  workOrderId: number | null;
};

export type SaleSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode?: string;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice?: SaleEinvoiceDetails;
  eway?: SaleEwayDetails;
  issuedOn: string;
  currencyId: number;
  financialYearId: number;
  invoiceNumber?: string;
  items: SaleLineItemInput[];
  notes: string;
  ledgerId: number | null;
  roundOff?: number;
  saleNumber: string;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: SaleStatus;
  taxType: SaleTaxType;
  terms: string;
  workOrderNo: string;
  workOrderId: number | null;
};

export type SaleView =
  | { mode: "list" }
  | { mode: "show"; sale: Sale }
  | { mode: "upsert"; sale: Sale | null; returnTo: "list" | "show" };

export type SalesView = SaleView;

export type SalePageResult = {
  items: Sale[];
  page: number;
  pageSize: number;
  total: number;
};

export function createEmptySale(): SaleSavePayload {
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
    einvoice: createEmptySaleEinvoice(),
    eway: createEmptySaleEway(),
    issuedOn: new Date().toISOString().slice(0, 10),
    financialYearId: 0,
    items: [],
    notes: "",
    ledgerId: null,
    roundOff: 0,
    saleNumber: "",
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

export function createEmptySaleEway(): SaleEwayDetails {
  return {
    billDate: "",
    billNo: "",
    notes: "",
    part: "Part B",
    status: "not-generated",
    transport: "",
    transportGst: "",
    transportId: null,
    vehicleNo: ""
  };
}

export function createEmptySaleEinvoice(): SaleEinvoiceDetails {
  return { ackDate: "", ackNo: "", irn: "", signedQr: "", status: "not-generated" };
}

export function createEmptySaleItem(): SaleLineItemInput {
  return {
    colour: "",
    colourId: null,
    dcNo: "",
    description: "",
    hsnCode: "",
    hsnCodeId: null,
    poNo: "",
    productName: "",
    productId: null,
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
