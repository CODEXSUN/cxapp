export type ExportSaleStatus = "draft" | "confirmed" | "cancelled";
export type ExportSaleTaxType = "cgst-sgst" | "igst";
export type GstDocumentStatus = "not-generated" | "generated";

export type ExportSaleContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
};

export type ExportSaleEwayDetails = {
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

export type ExportSaleEinvoiceDetails = {
  ackDate: string;
  ackNo: string;
  irn: string;
  signedQr: string;
  status: GstDocumentStatus;
};

export type ExportSaleLineItemInput = {
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

export type ExportSaleLineItem = ExportSaleLineItemInput & {
  cgstAmount: number;
  id: string;
  igstAmount: number;
  lineNumber: number;
  lineTotal: number;
  sgstAmount: number;
  taxableAmount: number;
  taxAmount: number;
};

export type ExportSale = {
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
  einvoice: ExportSaleEinvoiceDetails;
  eway: ExportSaleEwayDetails;
  financialYearId: number;
  financialYearName: string;
  id: string;
  invoiceNumber: string;
  issuedOn: string;
  items: ExportSaleLineItem[];
  ledgerId: number | null;
  lineNumber: number;
  notes: string;
  roundOff: number;
  salesLedger: string;
  shippingAddress: string;
  shippingAddressId: number;
  status: ExportSaleStatus;
  subtotal: number;
  taxAmount: number;
  taxType: ExportSaleTaxType;
  terms: string;
  updatedAt: string;
  workOrderId: number | null;
  workOrderNo: string;
};

export type ExportSaleSavePayload = {
  billingAddress: string;
  billingAddressId: number;
  companyId: number;
  currencyCode: string;
  currencyId: number;
  customerEmail: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  einvoice?: ExportSaleEinvoiceDetails | undefined;
  eway?: ExportSaleEwayDetails | undefined;
  financialYearId: number;
  invoiceNumber: string;
  issuedOn: string;
  items: ExportSaleLineItemInput[];
  ledgerId: number | null;
  notes: string;
  roundOff?: number | undefined;
  salesLedger?: string | undefined;
  shippingAddress: string;
  shippingAddressId: number;
  status: ExportSaleStatus;
  taxType?: ExportSaleTaxType | undefined;
  terms?: string | undefined;
  workOrderId: number | null;
  workOrderNo?: string | undefined;
};

export type ExportSalePage = { items: ExportSale[]; page: number; pageSize: number; total: number };
