export type PaymentStatus = "draft" | "posted" | "cancelled";
export type PaymentMode = "cash" | "bank" | "upi" | "transfer";
export type PaymentDecimalInput = string | number;
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
  allocatedAmount: PaymentDecimalInput;
  purchaseId: string;
};
export type PaymentAllocation = Omit<PaymentAllocationInput, "allocatedAmount"> & {
  allocatedAmount: number;
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
  amount: PaymentDecimalInput;
  companyId: number;
  currencyId: number;
  supplierId: number;
  discountAmount: PaymentDecimalInput;
  financialYearId: number;
  ledgerId: number;
  notes: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  paymentNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: PaymentDecimalInput;
  tdsAmount: PaymentDecimalInput;
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
export type PaymentLookupRecord = {
  addresses?: Array<Record<string, unknown>>;
  code?: string | null;
  gstin?: string | null;
  id: string;
  isActive?: boolean | null;
  legalName?: string | null;
  name?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  typeId?: string | null;
  typeName?: string | null;
};
export type PaymentContactSavePayload = {
  addressLine1: string;
  addressLine2: string;
  addressTypeId: string;
  addressTypeName: string;
  cityId: string;
  cityName: string;
  countryId: string;
  countryName: string;
  districtId: string;
  districtName: string;
  gstin: string;
  legalName: string;
  name: string;
  pincodeId: string;
  pincodeName: string;
  primaryEmail: string;
  primaryPhone: string;
  stateId: string;
  stateName: string;
  typeId: string;
  typeName: string;
};
export type PaymentLocationKind = "cities" | "districts" | "pincodes" | "states";
export type PaymentLocationRecord = {
  areaName?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  code: string;
  countryId?: string | null;
  countryName?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  id: string;
  name: string;
  pincode?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  status?: "active" | "inactive";
};
export type PaymentLookupOption = {
  description?: string;
  label: string;
  record: PaymentLookupRecord;
  value: string;
};
export type PaymentView =
  | { mode: "list" }
  | { mode: "upsert"; payment: Payment | null; returnTo: "list" | "show" }
  | { mode: "show"; payment: Payment };

export type PaymentPageResult = { items: Payment[]; page: number; pageSize: number; total: number };

export function emptyPayment(context?: PaymentContext | null): PaymentSavePayload {
  return {
    allocations: [],
    amount: "",
    companyId: context?.companyId ?? 0,
    currencyId: context?.currencyId ?? 0,
    supplierId: 0,
    discountAmount: "",
    financialYearId: context?.financialYearId ?? 0,
    ledgerId: 0,
    notes: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: "cash",
    paymentNumber: context?.suggestedPaymentNumber ?? "",
    referenceDate: "",
    referenceNo: "",
    roundOff: "",
    tdsAmount: ""
  };
}

export function paymentToPayload(payment: Payment): PaymentSavePayload {
  return {
    allocations: payment.allocations.map(({ allocatedAmount, purchaseId }) => ({
      allocatedAmount: String(allocatedAmount),
      purchaseId
    })),
    amount: String(payment.amount),
    companyId: payment.companyId,
    currencyId: payment.currencyId,
    supplierId: payment.supplierId,
    discountAmount: String(payment.discountAmount),
    financialYearId: payment.financialYearId,
    ledgerId: payment.ledgerId,
    notes: payment.notes,
    paymentDate: payment.paymentDate,
    paymentMode: payment.paymentMode,
    paymentNumber: payment.paymentNumber,
    referenceDate: payment.referenceDate,
    referenceNo: payment.referenceNo,
    roundOff: String(payment.roundOff),
    tdsAmount: String(payment.tdsAmount)
  };
}
