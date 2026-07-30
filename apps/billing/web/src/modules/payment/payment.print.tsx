import { BillingDocumentHeader } from "../settings";
import type { Payment } from "./payment.types";
export function PaymentPrint({ payment }: { payment: Payment }) {
  return (
    <div className="payment-print mx-auto max-w-[800px] border border-slate-300 bg-white text-slate-900 print:border-0">
      <BillingDocumentHeader documentMeta={payment.paymentNumber} documentTitle="Payment Voucher" />
      <div className="grid grid-cols-2 gap-6 border-b border-slate-300 px-8 py-5 text-sm">
        <p>
          <b>Paid to</b>
          <br />
          {payment.supplierName}
        </p>
        <p>
          <b>Date</b>
          <br />
          {payment.paymentDate}
        </p>
        <p>
          <b>Mode</b>
          <br />
          {payment.paymentMode}
        </p>
        <p>
          <b>Reference</b>
          <br />
          {payment.referenceNo || "-"}
        </p>
      </div>
      <div className="px-8 py-6">
        <div className="flex justify-between border-b border-slate-200 py-2">
          <span>Amount</span>
          <b>{money(payment.amount)}</b>
        </div>
        <div className="flex justify-between border-b border-slate-200 py-2">
          <span>Allocated</span>
          <b>{money(payment.allocatedAmount)}</b>
        </div>
        <div className="flex justify-between py-2 text-lg">
          <span>Total</span>
          <b>{money(payment.totalAmount)}</b>
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
