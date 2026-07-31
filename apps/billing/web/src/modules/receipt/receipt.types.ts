export type ReceiptStatus = "draft" | "posted" | "cancelled";
export type ReceiptMode = "cash" | "bank" | "upi" | "transfer";
export type ReceiptDecimalInput = string | number;
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
  allocatedAmount: ReceiptDecimalInput;
  saleId: string;
};
export type ReceiptAllocation = Omit<ReceiptAllocationInput, "allocatedAmount"> & {
  allocatedAmount: number;
  documentDate: string;
  documentNo: string;
  documentTotal: number;
  id: string;
  previousBalance: number;
};
export type Receipt = {
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
  amount: ReceiptDecimalInput;
  companyId: number;
  currencyId: number;
  customerId: number;
  discountAmount: ReceiptDecimalInput;
  financialYearId: number;
  ledgerId: number;
  notes: string;
  receiptDate: string;
  receiptMode: ReceiptMode;
  receiptNumber: string;
  referenceDate: string;
  referenceNo: string;
  roundOff: ReceiptDecimalInput;
  tdsAmount: ReceiptDecimalInput;
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
export type ReceiptLookupRecord = {
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
export type ReceiptContactSavePayload = {
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
export type ReceiptLocationKind = "cities" | "districts" | "pincodes" | "states";
export type ReceiptLocationRecord = {
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
export type ReceiptLookupOption = {
  description?: string;
  label: string;
  record: ReceiptLookupRecord;
  value: string;
};
export type ReceiptView =
  | { mode: "list" }
  | { mode: "upsert"; receipt: Receipt | null; returnTo: "list" | "show" }
  | { mode: "show"; receipt: Receipt };

export type ReceiptPageResult = { items: Receipt[]; page: number; pageSize: number; total: number };

export function emptyReceipt(context?: ReceiptContext | null): ReceiptSavePayload {
  return {
    allocations: [],
    amount: "",
    companyId: context?.companyId ?? 0,
    currencyId: context?.currencyId ?? 0,
    customerId: 0,
    discountAmount: "",
    financialYearId: context?.financialYearId ?? 0,
    ledgerId: 0,
    notes: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    receiptMode: "cash",
    receiptNumber: context?.suggestedReceiptNumber ?? "",
    referenceDate: "",
    referenceNo: "",
    roundOff: "",
    tdsAmount: ""
  };
}

export function receiptToPayload(receipt: Receipt): ReceiptSavePayload {
  return {
    allocations: receipt.allocations.map(({ allocatedAmount, saleId }) => ({
      allocatedAmount: String(allocatedAmount),
      saleId
    })),
    amount: String(receipt.amount),
    companyId: receipt.companyId,
    currencyId: receipt.currencyId,
    customerId: receipt.customerId,
    discountAmount: String(receipt.discountAmount),
    financialYearId: receipt.financialYearId,
    ledgerId: receipt.ledgerId,
    notes: receipt.notes,
    receiptDate: receipt.receiptDate,
    receiptMode: receipt.receiptMode,
    receiptNumber: receipt.receiptNumber,
    referenceDate: receipt.referenceDate,
    referenceNo: receipt.referenceNo,
    roundOff: String(receipt.roundOff),
    tdsAmount: String(receipt.tdsAmount)
  };
}
