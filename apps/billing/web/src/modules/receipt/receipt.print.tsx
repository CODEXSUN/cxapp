import { BillingDocumentHeader } from "../settings";
import type { Receipt } from "./receipt.types";
export function ReceiptPrint({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt-print mx-auto max-w-[800px] border border-slate-300 bg-white text-slate-900 print:border-0">
      <BillingDocumentHeader documentMeta={receipt.receiptNumber} documentTitle="Receipt Voucher" />
      <div className="grid grid-cols-2 gap-6 border-b border-slate-300 px-8 py-5 text-sm">
        <p>
          <b>Received from</b>
          <br />
          {receipt.customerName}
        </p>
        <p>
          <b>Date</b>
          <br />
          {receipt.receiptDate}
        </p>
        <p>
          <b>Mode</b>
          <br />
          {receipt.receiptMode}
        </p>
        <p>
          <b>Reference</b>
          <br />
          {receipt.referenceNo || "-"}
        </p>
      </div>
      <div className="px-8 py-6">
        <div className="flex justify-between border-b border-slate-200 py-2">
          <span>Amount</span>
          <b>{money(receipt.amount)}</b>
        </div>
        <div className="flex justify-between border-b border-slate-200 py-2">
          <span>Allocated</span>
          <b>{money(receipt.allocatedAmount)}</b>
        </div>
        <div className="flex justify-between py-2 text-lg">
          <span>Total</span>
          <b>{money(receipt.totalAmount)}</b>
        </div>
      </div>
      <div className="mx-8 mb-8 mt-20 grid grid-cols-2 gap-8 border-t border-slate-300 pt-3 text-sm">
        <span>Received by</span>
        <span>Authorised signatory</span>
      </div>
    </div>
  );
}
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}
