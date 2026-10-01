import type { Payment, PaymentAllocationCandidate } from "./payment.types";

export function availablePaymentCandidates(
  candidates: PaymentAllocationCandidate[],
  supplierId: number,
  currencyId: number,
  payment?: Pick<Payment, "supplierId" | "currencyId" | "allocations" | "status"> | null
) {
  const matching = candidates.filter(
    (item) => item.supplierId === supplierId && item.currencyId === currencyId
  );
  const merged = new Map(matching.map((item) => [item.purchaseId, item]));
  if (
    payment?.supplierId !== supplierId ||
    payment.currencyId !== currencyId ||
    payment.status === "cancelled"
  )
    return [...merged.values()];
  for (const item of payment.allocations) {
    const candidate = merged.get(item.purchaseId);
    merged.set(item.purchaseId, {
      supplierId,
      currencyId,
      documentDate: item.documentDate,
      documentNo: item.documentNo,
      documentTotal: item.documentTotal,
      outstandingAmount: (candidate?.outstandingAmount ?? 0) + item.allocatedAmount,
      purchaseId: item.purchaseId
    });
  }
  return [...merged.values()];
}
