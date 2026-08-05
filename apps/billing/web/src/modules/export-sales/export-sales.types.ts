export type ExportSaleStatus = "draft" | "confirmed" | "cancelled";
export type ExportSaleTaxType = "cgst-sgst" | "igst";
export type ExportSaleDecimalInput = string | number;
export type ExportSaleGstDocumentStatus = "not-generated" | "generated";

export type ExportSaleEwayDetails = {
  billDate: string;
  billNo: string;
  notes: string;
  part: "Part A" | "Part B";
  status: ExportSaleGstDocumentStatus;
  transport: string;
  transportGst: string;
  transportId: number | null;
  vehicleNo: string;
};

export type ExportSaleContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
};

export type ExportSaleEinvoiceDetails = {
  ackDate: string;
  ackNo: string;
  irn: string;
  signedQr: string;
  status: ExportSaleGstDocumentStatus;
};

export type ExportSaleLineItemInput = {
  colour: string;
  colourId: number | null;
  dcNo: string;
  description: string;
  hsnCode: string;
  hsnCodeId: number | null;
  poNo: string;
  productName: string;
  productId: number | null;
  quantity: ExportSaleDecimalInput;
  rate: ExportSaleDecimalInput;
  size: string;
  sizeId: number | null;
  taxId: number | null;
  taxRate: ExportSaleDecimalInput;
  unit: string;
  unitId: number;
};

export type ExportSaleLineItem = Omit<ExportSaleLineItemInput, "quantity" | "rate" | "taxRate"> & {
  cgstAmount: number;
  id: string;
  lineNumber: number;
  igstAmount: number;
  lineTotal: number;
  sgstAmount: number;
  taxableAmount: number;
  taxAmount: number;
  quantity: number;
  rate: number;
  taxRate: number;
};

export type ExportSale = {
  amount: number;
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  customerEmail: string;
  customerGstin: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice: ExportSaleEinvoiceDetails;
  eway: ExportSaleEwayDetails;
  id: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
  items: ExportSaleLineItem[];
  issuedOn: string;
  notes: string;
  ledgerId: number | null;
  lineNumber: number;
  roundOff: number;
  invoiceNumber: string;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: ExportSaleStatus;
  subtotal: number;
  taxAmount: number;
  taxType: ExportSaleTaxType;
  terms: string;
  updatedAt: string;
  workOrderNo: string;
  workOrderId: number | null;
};

export type ExportSaleSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode?: string;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice?: ExportSaleEinvoiceDetails;
  eway?: ExportSaleEwayDetails;
  issuedOn: string;
  currencyId: number;
  financialYearId: number;
  invoiceNumber: string;
  items: ExportSaleLineItemInput[];
  notes: string;
  ledgerId: number | null;
  roundOff?: ExportSaleDecimalInput;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: ExportSaleStatus;
  taxType: ExportSaleTaxType;
  terms: string;
  workOrderNo: string;
  workOrderId: number | null;
};

export type ExportSaleView =
  | { mode: "list" }
  | { mode: "show"; exportSale: ExportSale }
  | { mode: "upsert"; exportSale: ExportSale | null; returnTo: "list" | "show" };

export type ExportSalesView = ExportSaleView;

export function createEmptyExportSale(): ExportSaleSavePayload {
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
    einvoice: createEmptyExportSaleEinvoice(),
    eway: createEmptyExportSaleEway(),
    issuedOn: new Date().toISOString().slice(0, 10),
    financialYearId: 0,
    items: [],
    notes: "",
    ledgerId: null,
    roundOff: "",
    invoiceNumber: "",
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

export function createEmptyExportSaleEway(): ExportSaleEwayDetails {
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

export function createEmptyExportSaleEinvoice(): ExportSaleEinvoiceDetails {
  return { ackDate: "", ackNo: "", irn: "", signedQr: "", status: "not-generated" };
}

export function createEmptyExportSaleItem(): ExportSaleLineItemInput {
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
    quantity: "1",
    rate: "",
    size: "",
    sizeId: null,
    taxId: null,
    taxRate: "18",
    unit: "Nos",
    unitId: 0
  };
}

export type ExportSalePageResult = {
  items: ExportSale[];
  page: number;
  pageSize: number;
  total: number;
};
