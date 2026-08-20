export type ReceiptStatus = "draft" | "posted" | "cancelled";
export type ReceiptMode = "cash" | "bank" | "upi" | "transfer";

export type ReceiptContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
  suggestedReceiptNumber: string;
};

export type ReceiptAllocationInput = {
  allocatedAmount: number;
  saleId: string;
};

export type ReceiptAllocation = ReceiptAllocationInput & {
  documentDate: string;
  documentNo: string;
  documentTotal: number;
  id: string;
  previousBalance: number;
};

export type Receipt = {
  numberingWarning?: string;
  allocatedAmount: number;
  allocations: ReceiptAllocation[];
  amount: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  currencyCode: string;
  currencyId: number;
  customerId: number;
  customerName: string;
  discountAmount: number;
  financialYearId: number;
  financialYearName: string;
  id: string;
  ledgerId: number;
  ledgerName: string;
  lineNumber: number;
  notes: string;
  receiptDate: string;
  receiptMode: ReceiptMode;
  receiptNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: number;
  status: ReceiptStatus;
  tdsAmount: number;
  totalAmount: number;
  unallocatedAmount: number;
  updatedAt: string;
};

export type ReceiptSavePayload = {
  allocations: ReceiptAllocationInput[];
  amount: number;
  companyId: number;
  currencyId: number;
  customerId: number;
  discountAmount: number;
  financialYearId: number;
  ledgerId: number;
  notes: string;
  receiptDate: string;
  receiptMode: ReceiptMode;
  receiptNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: number;
  tdsAmount: number;
};

export type ReceiptAllocationCandidate = {
  customerId: number;
  documentDate: string;
  documentNo: string;
  documentTotal: number;
  outstandingAmount: number;
  saleId: string;
};

export type ReceiptActivity = {
  action: string;
  createdAt: string;
  description: string;
  id: string;
  newStatus: ReceiptStatus | null;
  previousStatus: ReceiptStatus | null;
};

export type ReceiptEvent = {
  correlationId: string;
  occurredAt: string;
  receiptId: string;
  tenantDatabase: string;
  type: "billing.receipt.created" | "billing.receipt.posted" | "billing.receipt.cancelled";
};

export type ReceiptJob = {
  correlationId: string;
  name: "receipt.post";
  receiptId: string;
  tenantDatabase: string;
};

export type ReceiptPage = { items: Receipt[]; page: number; pageSize: number; total: number };
