import type { Receipt, ReceiptAllocationCandidate } from "./receipt.types";

export function receiptAllocationKey(item: {
  saleId: string;
  documentKind?: "sale" | "export-sale" | undefined;
}) {
  return `${item.documentKind ?? "sale"}:${item.saleId}`;
}

export function availableReceiptCandidates(
  candidates: ReceiptAllocationCandidate[],
  customerId: number,
  currencyId: number,
  receipt?: Pick<Receipt, "customerId" | "currencyId" | "allocations" | "status"> | null
) {
  const matching = candidates.filter(
    (item) => item.customerId === customerId && item.currencyId === currencyId
  );
  const merged = new Map(matching.map((item) => [receiptAllocationKey(item), item]));
  if (
    receipt?.customerId !== customerId ||
    receipt.currencyId !== currencyId ||
    receipt.status === "cancelled"
  )
    return [...merged.values()];
  for (const item of receipt.allocations) {
    const candidate = merged.get(receiptAllocationKey(item));
    merged.set(receiptAllocationKey(item), {
      documentKind: item.documentKind,
      customerId,
      currencyId,
      documentDate: item.documentDate,
      documentNo: item.documentNo,
      documentTotal: item.documentTotal,
      outstandingAmount: (candidate?.outstandingAmount ?? 0) + item.allocatedAmount,
      saleId: item.saleId
    });
  }
  return [...merged.values()];
}
