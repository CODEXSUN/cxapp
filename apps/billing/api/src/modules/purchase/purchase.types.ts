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
  financialYearId: number;
  financialYearName: string;
};

export type PurchaseLineItemInput = {
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
  currencyCode?: string | undefined;
  currencyId: number;
  einvoice?: PurchaseEinvoiceDetails | undefined;
  eway?: PurchaseEwayDetails | undefined;
  supplierEmail: string;
  supplierId: number;
  supplierName: string;
  supplierPhone: string;
  supplierBillDate?: string | undefined;
  supplierBillNo?: string | undefined;
  issuedOn: string;
  financialYearId: number;
  items: PurchaseLineItemInput[];
  ledgerId: number | null;
  notes: string;
  invoiceNumber: string;
  roundOff?: number | undefined;
  salesLedger?: string | undefined;
  shippingAddress: string;
  shippingAddressId: number;
  status: PurchaseStatus;
  taxType?: PurchaseTaxType | undefined;
  terms?: string | undefined;
  workOrderId: number | null;
  workOrderNo?: string | undefined;
};

export type PurchasePage = { items: Purchase[]; page: number; pageSize: number; total: number };
