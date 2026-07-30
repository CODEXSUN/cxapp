import type { Quotation } from "./quotation.types.js";

export function shouldSyncQuotation(quotation: Pick<Quotation, "amount" | "status">) {
  return quotation.status === "confirmed" && quotation.amount > 0;
}

export function buildQuotationSyncSummary(quotations: Array<Pick<Quotation, "amount" | "status">>) {
  const ready = quotations.filter(shouldSyncQuotation).length;
  return { ready, skipped: quotations.length - ready, total: quotations.length };
}
