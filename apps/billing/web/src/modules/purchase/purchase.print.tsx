import { useEffect, useRef } from "react";
import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingCompanyName, BillingDocumentHeader, useBillingSettings } from "../settings";
import { usePurchaseRecord } from "./purchase.hooks";
import { formatDate, formatMoney } from "./purchase.services";
import type { Purchase } from "./purchase.types";

export type PurchasePrintCopy = "duplicate" | "office-copy" | "original";

export function PurchasePrintRoutePage() {
  const search = new URLSearchParams(window.location.search);
  const purchaseId = search.get("id");
  const autoPrint = search.get("autoprint") === "1";
  const purchaseQuery = usePurchaseRecord(purchaseId, true);
  const settingsQuery = useBillingSettings();
  const autoPrintTriggered = useRef(false);

  useEffect(() => {
    if (!autoPrint || !purchaseQuery.data || settingsQuery.isLoading || autoPrintTriggered.current)
      return;
    const closeAfterPrint = () => window.close();
    window.addEventListener("afterprint", closeAfterPrint, { once: true });
    const timeout = window.setTimeout(() => {
      autoPrintTriggered.current = true;
      window.print();
    }, 150);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("afterprint", closeAfterPrint);
    };
  }, [autoPrint, purchaseQuery.data, settingsQuery.isLoading]);

  if (purchaseQuery.isLoading || settingsQuery.isLoading) {
    return <GlobalLoader />;
  }

  return (
    <WorkspacePage
      className="billing-document-print-page"
      title={purchaseQuery.data ? `${purchaseQuery.data.invoiceNumber} print` : "Purchase print"}
      description="Printable purchase document."
      actions={
        <div className="flex gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button type="button" variant="outline" onClick={() => void purchaseQuery.refetch()}>
            <RefreshCw className={purchaseQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      }
    >
      <div className="print:hidden">
        <PageTitle title="Purchase Print" />
      </div>
      {purchaseQuery.data ? (
        <PurchasePrintDocument copy="original" purchase={purchaseQuery.data} />
      ) : (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          Purchase print record was not found.
        </div>
      )}
    </WorkspacePage>
  );
}

export function PurchasePrintDocument({
  copy,
  purchase
}: {
  copy: PurchasePrintCopy;
  purchase: Purchase;
}) {
  const layout = useBillingSettings().data?.layout;
  const showPo = layout?.usePo ?? false;
  const showDc = layout?.useDc ?? false;
  const showColour = layout?.useColour ?? false;
  const showSize = layout?.useSize ?? false;
  const pages = chunkItems(purchase.items, 12);

  return (
    <WorkspacePrintSheet className="billing-print-document">
      {pages.map((items, pageIndex) => (
        <PurchasePrintPage
          key={`purchase-print-page-${pageIndex}`}
          copy={copy}
          items={items}
          isLastPage={pageIndex === pages.length - 1}
          isMultiPage={pages.length > 1}
          pageIndex={pageIndex}
          pageCount={pages.length}
          showColour={showColour}
          showDc={showDc}
          showPo={showPo}
          showSize={showSize}
          purchase={purchase}
        />
      ))}
    </WorkspacePrintSheet>
  );
}

function PurchasePrintPage({
  copy,
  items,
  isLastPage,
  isMultiPage,
  pageIndex,
  pageCount,
  showColour,
  showDc,
  showPo,
  showSize,
  purchase
}: {
  copy: PurchasePrintCopy;
  items: Array<{ item: Purchase["items"][number]; index: number }>;
  isLastPage: boolean;
  isMultiPage: boolean;
  pageIndex: number;
  pageCount: number;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
  purchase: Purchase;
}) {
  const splitTax = purchase.taxType === "cgst-sgst";
  const blankRows = isLastPage ? Math.max(0, 12 - items.length) : 0;
  const headings = [
    "S.no",
    ...(showPo ? ["PO"] : []),
    ...(showDc ? ["DC"] : []),
    "Particulars",
    "HSN Code",
    ...(showColour ? ["Colour"] : []),
    ...(showSize ? ["Size"] : []),
    "Qty",
    "Rate",
    "Taxable",
    "GST %",
    "GST TAX",
    "Total"
  ];

  return (
    <article
      className={`bg-white px-3 py-3 text-[10px] text-black ${pageIndex > 0 ? "break-before-page" : ""}`}
    >
      <div className="border border-slate-300">
        <header className="border-b border-slate-300 px-3 py-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h1 className="text-center text-[11px] font-semibold tracking-wide">PURCHASE</h1>
            <span className="text-right text-[9px]">
              {printCopyLabel(copy)}
              {isMultiPage ? ` - Page ${pageIndex + 1} of ${pageCount}` : ""}
            </span>
          </div>
        </header>

        <BillingDocumentHeader />

        <section className="grid border-b border-slate-300 text-[10px] sm:grid-cols-2">
          <div className="px-2 py-2">
            <div className="font-medium">Supplier (Bill to)</div>
            <div className="mt-1 font-semibold">M/s. {purchase.supplierName}</div>
            <div className="mt-1 whitespace-pre-wrap">
              {purchase.billingAddress || "Address not set"}
            </div>
            <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2">
              <span>GSTIN/UIN</span>
              <span>:</span>
              <span>State Name</span>
              <span>:</span>
            </div>
          </div>
          <div className="space-y-1 border-t border-slate-300 px-2 py-2 sm:border-l sm:border-slate-300 sm:border-t-0">
            <PrintPair label="Purchase No:">{purchase.invoiceNumber}</PrintPair>
            <PrintPair label="Date:">{formatDate(purchase.issuedOn)}</PrintPair>
            <PrintPair label="Supplier Bill No:">{purchase.supplierBillNo || "-"}</PrintPair>
            <PrintPair label="Supplier Bill Date:">
              {purchase.supplierBillDate ? formatDate(purchase.supplierBillDate) : "-"}
            </PrintPair>
            <PrintPair label="Work Order:">{purchase.workOrderNo || "-"}</PrintPair>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-slate-300">
                {headings.map((heading) => (
                  <th
                    key={heading}
                    className="border-r border-slate-300 px-2 py-2 text-center font-semibold last:border-r-0"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageIndex > 0 ? (
                <tr>
                  <td
                    className="border-b border-slate-300 px-2 py-1 text-left font-semibold"
                    colSpan={headings.length}
                  >
                    Carry forward from previous page
                  </td>
                </tr>
              ) : null}
              {items.map(({ item, index }) => (
                <PurchasePrintItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  showColour={showColour}
                  showDc={showDc}
                  showPo={showPo}
                  showSize={showSize}
                />
              ))}
              {Array.from({ length: blankRows }).map((_, index) => (
                <PurchasePrintBlankRow
                  key={`blank-${pageIndex}-${index}`}
                  columnCount={headings.length}
                />
              ))}
              {isLastPage ? (
                <PurchasePrintTotalRow
                  purchase={purchase}
                  leadingColumnCount={
                    3 + Number(showPo) + Number(showDc) + Number(showColour) + Number(showSize)
                  }
                />
              ) : (
                <tr>
                  <td
                    className="border-t border-slate-300 px-2 py-2 text-right font-semibold"
                    colSpan={headings.length}
                  >
                    To be continued...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {isLastPage ? (
          <>
            <section className="grid grid-cols-[1fr_12rem] border-t border-slate-300">
              <div className="border-r border-slate-300 px-2 py-2 text-[9px] leading-4">
                <div className="font-medium">E&amp;OE</div>
                <div className="mt-1">
                  We hereby certify that our registration under the GST Act 2017 is in force on the
                  date on which sale of goods specified in this invoice is made by us and the sale
                  is effected in the regular course of business.
                </div>
                <div className="mt-1 font-semibold">
                  * Goods once sold will not be taken back unless agreed in writing.
                </div>
                <div className="mt-5">
                  <div className="font-medium">Amount (in words)</div>
                  <div className="mt-1">{amountInWords(purchase.amount)}</div>
                </div>
              </div>
              <div className="text-[9px]">
                <PrintTotal label="Taxable Value" value={money(purchase.subtotal)} />
                {splitTax ? (
                  <>
                    <PrintTotal label="Total CGST" value={money(purchase.taxAmount / 2)} />
                    <PrintTotal label="Total SGST" value={money(purchase.taxAmount / 2)} />
                  </>
                ) : (
                  <PrintTotal label="Total IGST" value={money(purchase.taxAmount)} />
                )}
                <PrintTotal label="Total GST" value={money(purchase.taxAmount)} />
                <PrintTotal label="Round Off" value={money(purchase.roundOff)} />
                <PrintTotal label="GRAND TOTAL" strong value={money(purchase.amount)} />
              </div>
            </section>
            <section className="grid min-h-[5rem] grid-cols-[1fr_18rem] border-t border-slate-300">
              <div className="flex items-end border-r border-slate-300 px-2 py-2 text-[9px]">
                <div className="mt-4">Receiver Sign</div>
              </div>
              <div className="grid grid-rows-[1fr_auto] px-2 py-2 text-[9px]">
                <div className="font-semibold">
                  For <BillingCompanyName />
                </div>
                <div className="font-semibold">Authorised Signatory</div>
              </div>
            </section>
            <footer className="border-t border-slate-300 px-2 py-1 text-[9px]">
              Subject to Tiruppur Jurisdiction
            </footer>
          </>
        ) : null}
      </div>
    </article>
  );
}

function PurchasePrintItemRow({
  item,
  index,
  showColour,
  showDc,
  showPo,
  showSize
}: {
  item: Purchase["items"][number];
  index: number;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
}) {
  return (
    <tr className="align-top">
      <td className="border-r border-slate-200 px-2 py-2 text-center">{index + 1}</td>
      {showPo ? (
        <td className="border-r border-slate-200 px-2 py-2 text-center">{item.poNo || "-"}</td>
      ) : null}
      {showDc ? (
        <td className="border-r border-slate-200 px-2 py-2 text-center">{item.dcNo || "-"}</td>
      ) : null}
      <td className="border-r border-slate-200 px-2 py-2">
        <div className="font-medium">
          {[item.productName, item.description].filter(Boolean).join(" - ")}
        </div>
      </td>
      <td className="border-r border-slate-200 px-2 py-2 text-center">{item.hsnCode || "-"}</td>
      {showColour ? (
        <td className="border-r border-slate-200 px-2 py-2 text-center">{item.colour || "-"}</td>
      ) : null}
      {showSize ? (
        <td className="border-r border-slate-200 px-2 py-2 text-center">{item.size || "-"}</td>
      ) : null}
      <td className="border-r border-slate-200 px-2 py-2 text-center">{item.quantity}</td>
      <td className="border-r border-slate-200 px-2 py-2 text-right">{money(item.rate)}</td>
      <td className="border-r border-slate-200 px-2 py-2 text-right">
        {money(item.taxableAmount)}
      </td>
      <td className="border-r border-slate-200 px-2 py-2 text-center">{item.taxRate}%</td>
      <td className="border-r border-slate-200 px-2 py-2 text-right">{money(item.taxAmount)}</td>
      <td className="px-2 py-2 text-right">{money(item.lineTotal)}</td>
    </tr>
  );
}

function PurchasePrintBlankRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="h-6">
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className={index === columnCount - 1 ? "" : "border-r border-slate-200"} />
      ))}
    </tr>
  );
}

function PurchasePrintTotalRow({
  leadingColumnCount,
  purchase
}: {
  leadingColumnCount: number;
  purchase: Purchase;
}) {
  return (
    <tr className="border-t border-slate-300 font-semibold">
      <td className="border-r border-slate-200 px-2 py-2 text-right" colSpan={leadingColumnCount}>
        Total
      </td>
      <td className="border-r border-slate-200 px-2 py-2 text-center">
        {purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
      </td>
      <td className="border-r border-slate-200 px-2 py-2" />
      <td className="border-r border-slate-200 px-2 py-2 text-right">{money(purchase.subtotal)}</td>
      <td className="border-r border-slate-200 px-2 py-2" />
      <td className="border-r border-slate-200 px-2 py-2 text-right">
        {money(purchase.taxAmount)}
      </td>
      <td className="px-2 py-2 text-right">{money(purchase.amount)}</td>
    </tr>
  );
}

function chunkItems(items: Purchase["items"], _size: number) {
  const finalPageBudget = 12;
  const continuationPageBudget = 24;
  const pages: Array<Array<{ item: Purchase["items"][number]; index: number }>> = [];
  let index = 0;
  while (items.length - index > finalPageBudget) {
    pages.push(
      items
        .slice(index, index + continuationPageBudget)
        .map((item, offset) => ({ item, index: index + offset }))
    );
    index += continuationPageBudget;
  }
  pages.push(items.slice(index).map((item, offset) => ({ item, index: index + offset })));
  return pages;
}

function PrintPair({ children, label }: { children: string; label: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-2">
      <span>{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

function PrintTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-x-3 border-b border-slate-300 px-2 py-1.5 ${strong ? "font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function printCopyLabel(copy: PurchasePrintCopy) {
  if (copy === "duplicate") return "Duplicate";
  if (copy === "office-copy") return "Office Copy";
  return "Original";
}

function money(value: number) {
  return formatMoney(value).replace("₹", "").trim();
}

function amountInWords(value: number) {
  const amount = Math.round(Number(value || 0));
  if (!amount) return "Zero Rupees Only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety"
  ];
  const chunk = (num: number): string => {
    if (num < 20) return ones[num] || "";
    if (num < 100)
      return [tens[Math.floor(num / 10)] || "", ones[num % 10] || ""].filter(Boolean).join(" ");
    return [ones[Math.floor(num / 100)] || "", "Hundred", chunk(num % 100)]
      .filter(Boolean)
      .join(" ");
  };
  const parts: string[] = [];
  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const hundred = amount % 1000;
  if (crore) parts.push(`${chunk(crore)} Crore`);
  if (lakh) parts.push(`${chunk(lakh)} Lakh`);
  if (thousand) parts.push(`${chunk(thousand)} Thousand`);
  if (hundred) parts.push(chunk(hundred));
  return `${parts.join(" ")} Rupees Only`;
}
