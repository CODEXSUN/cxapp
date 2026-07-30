export type SaleStatus = "draft" | "confirmed" | "cancelled";
export type SaleTaxType = "cgst-sgst" | "igst";
export type GstDocumentStatus = "not-generated" | "generated";

export type SaleContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
};

export type SaleEwayDetails = {
  billDate: string;
  billNo: string;
  notes: string;
  part: "Part A" | "Part B";
  status: GstDocumentStatus;
  transport: string;
  transportGst: string;
  transportId: number | null;
  vehicleNo: string;
};

export type SaleEinvoiceDetails = {
  ackDate: string;
  ackNo: string;
  irn: string;
  signedQr: string;
  status: GstDocumentStatus;
};

export type SaleLineItemInput = {
  colour?: string | undefined;
  colourId: number | null;
  dcNo?: string | undefined;
  description: string;
  hsnCode: string;
  hsnCodeId: number | null;
  poNo?: string | undefined;
  productId: number | null;
  productName?: string | undefined;
  quantity: number;
  rate: number;
  size?: string | undefined;
  sizeId: number | null;
  taxId: number | null;
  taxRate: number;
  unit: string;
  unitId: number;
};

export type SaleLineItem = SaleLineItemInput & {
  cgstAmount: number;
  id: string;
  igstAmount: number;
  lineNumber: number;
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
  currencyCode: string;
  currencyId: number;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice: SaleEinvoiceDetails;
  eway: SaleEwayDetails;
  financialYearId: number;
  financialYearName: string;
  id: string;
  invoiceNumber: string;
  issuedOn: string;
  items: SaleLineItem[];
  ledgerId: number | null;
  lineNumber: number;
  notes: string;
  numberingWarning: string;
  roundOff: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
  taxType: SaleTaxType;
  terms: string;
  updatedAt: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type SaleSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode: string;
  currencyId: number;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice?: SaleEinvoiceDetails | undefined;
  eway?: SaleEwayDetails | undefined;
  financialYearId: number;
  invoiceNumber: string;
  issuedOn: string;
  items: SaleLineItemInput[];
  ledgerId: number | null;
  notes: string;
  roundOff?: number | undefined;
  salesLedger?: string | undefined;
  shippingAddress: string;
  shippingAddressId: number;
  status: SaleStatus;
  taxType?: SaleTaxType | undefined;
  terms?: string | undefined;
  workOrderId: number | null;
  workOrderNo?: string | undefined;
};

export type SalePage = {
  items: Sale[];
  page: number;
  pageSize: number;
  total: number;
};
