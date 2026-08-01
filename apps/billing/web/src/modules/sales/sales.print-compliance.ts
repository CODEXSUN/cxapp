import type { BillingDocumentLayoutSettings } from "../settings/settings.types";
import type { Sale } from "./sales.types";

export function saleCompliancePrintFields(
  sale: Pick<Sale, "einvoice" | "eway">,
  layout: Pick<BillingDocumentLayoutSettings, "useEinvoice" | "useEway">
) {
  const irn = layout.useEinvoice && hasText(sale.einvoice.irn);
  const ewayBillNo = layout.useEway && hasText(sale.eway.billNo);
  return {
    ackDate: irn && hasText(sale.einvoice.ackDate),
    ackNo: irn && hasText(sale.einvoice.ackNo),
    ewayBillDate: ewayBillNo && hasText(sale.eway.billDate),
    ewayBillNo,
    irn
  };
}

function hasText(value: string) {
  return value.trim().length > 0;
}
