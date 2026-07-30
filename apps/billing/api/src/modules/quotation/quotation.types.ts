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
  currencyCode?: string | undefined;
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
  roundOff?: number | undefined;
  salesLedger?: string | undefined;
  shippingAddress: string;
  shippingAddressId: number;
  status: QuotationStatus;
  taxType?: QuotationTaxType | undefined;
  terms?: string | undefined;
  workOrderId: number | null;
  workOrderNo?: string | undefined;
};

export type QuotationPage = {
  items: Quotation[];
  page: number;
  pageSize: number;
  total: number;
};
