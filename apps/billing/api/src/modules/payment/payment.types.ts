export type PaymentStatus = "draft" | "posted" | "cancelled";
export type PaymentMode = "cash" | "bank" | "upi" | "transfer";

export type PaymentContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  currencyId: number;
  financialYearId: number;
  financialYearName: string;
  suggestedPaymentNumber: string;
};

export type PaymentAllocationInput = {
  allocatedAmount: number;
  purchaseId: string;
};

export type PaymentAllocation = PaymentAllocationInput & {
  documentDate: string;
  documentNo: string;
  documentTotal: number;
  id: string;
  previousBalance: number;
};

export type Payment = {
  allocatedAmount: number;
  allocations: PaymentAllocation[];
  amount: number;
  companyId: number;
  companyName: string;
  createdAt: string;
  currencyCode: string;
  currencyId: number;
  supplierId: number;
  supplierName: string;
  discountAmount: number;
  financialYearId: number;
  financialYearName: string;
  id: string;
  ledgerId: number;
  ledgerName: string;
  lineNumber: number;
  notes: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: number;
  status: PaymentStatus;
  tdsAmount: number;
  totalAmount: number;
  unallocatedAmount: number;
  updatedAt: string;
};

export type PaymentSavePayload = {
  allocations: PaymentAllocationInput[];
  amount: number;
  companyId: number;
  currencyId: number;
  supplierId: number;
  discountAmount: number;
  financialYearId: number;
  ledgerId: number;
  notes: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: number;
  tdsAmount: number;
};

export type PaymentAllocationCandidate = {
  supplierId: number;
  documentDate: string;
  documentNo: string;
  documentTotal: number;
  outstandingAmount: number;
  purchaseId: string;
};

export type PaymentActivity = {
  action: string;
  createdAt: string;
  description: string;
  id: string;
  newStatus: PaymentStatus | null;
  previousStatus: PaymentStatus | null;
};

export type PaymentJob = {
  correlationId: string;
  name: "payment.activity-sync" | "payment.posting-sync";
  paymentId: string;
  tenantDatabase: string;
};

export type PaymentPage = { items: Payment[]; page: number; pageSize: number; total: number };
