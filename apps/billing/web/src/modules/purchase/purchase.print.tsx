import { useEffect, useRef } from "react";
import { WorkspacePrintSheet } from "@cxapp/ui/workspace/print";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import {
  useCompanyBranding,
  type CompanyRecord
} from "@cxapp/core-web/modules/organisation/company";
import { PageTitle } from "../../shared/document/PageTitle";
import {
  getBillingPrintDummyLineCount,
  paginateBillingPrintItems
} from "../../shared/document/print-pagination";
import {
  BillingCompanyName,
  BillingDocumentHeader,
  useBillingDocumentTitle,
  useBillingSettings
} from "../settings";
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
  const billingSettings = useBillingSettings().data;
  const documentTitle = useBillingDocumentTitle("purchase");
  const company = useCompanyBranding(purchase.companyId).company;
  const layout = billingSettings?.layout;
  const addressMode = billingSettings?.printing.addressMode ?? "billing_and_shipping";
  const primaryBankAccount =
    billingSettings?.printing.printAccountNumber === true
      ? (company?.bankAccounts.find(
          (account) => account.isPrimary && hasDisplayValue(account.accountNumber)
        ) ?? null)
      : null;
  const showPo = layout?.usePo ?? false;
  const showDc = layout?.useDc ?? false;
  const showColour = layout?.useColour ?? false;
  const showSize = layout?.useSize ?? false;
  const showWorkOrder = layout?.useWorkOrder ?? true;
  const pages = paginateBillingPrintItems(purchase.items);

  return (
    <WorkspacePrintSheet className="billing-print-document">
      {pages.map((items, pageIndex) => (
        <PurchasePrintPage
          key={`purchase-print-page-${pageIndex}`}
          copy={copy}
          documentTitle={documentTitle}
          items={items}
          isLastPage={pageIndex === pages.length - 1}
          isMultiPage={pages.length > 1}
          pageIndex={pageIndex}
          pageCount={pages.length}
          addressMode={addressMode}
          bankAccount={primaryBankAccount}
          showColour={showColour}
          showDc={showDc}
          showPo={showPo}
          showSize={showSize}
          showWorkOrder={showWorkOrder}
          purchase={purchase}
        />
      ))}
    </WorkspacePrintSheet>
  );
}

function PurchasePrintPage({
  copy,
  documentTitle,
  items,
  isLastPage,
  isMultiPage,
  pageIndex,
  pageCount,
  addressMode,
  bankAccount,
  showColour,
  showDc,
  showPo,
  showSize,
  showWorkOrder,
  purchase
}: {
  copy: PurchasePrintCopy;
  documentTitle: string;
  items: Array<{ item: Purchase["items"][number]; index: number }>;
  isLastPage: boolean;
  isMultiPage: boolean;
  pageIndex: number;
  pageCount: number;
  addressMode: "billing_only" | "billing_and_shipping";
  bankAccount: CompanyRecord["bankAccounts"][number] | null;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
  showWorkOrder: boolean;
  purchase: Purchase;
}) {
  const splitTax = purchase.taxType === "cgst-sgst";
  const blankLines = getBillingPrintDummyLineCount(
    items.map(({ item }) => purchasePrintParticulars(item, showColour, showSize))
  );
  const headings = [
    "S.no",
    ...(showPo ? ["PO"] : []),
    ...(showDc ? ["DC"] : []),
    "Particulars",
    "HSN Code",
    "Qty",
    "Rate",
    "Taxable",
    "GST %",
    "GST TAX",
    "Total"
  ];

  return (
    <article
      className={`bg-white px-2 text-[10px] text-black ${pageIndex > 0 ? "break-before-page" : ""}`}
    >
      <div className="border border-slate-300">
        <header className="border-b border-slate-300 px-2 py-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h1 className="text-center text-[11px] font-semibold uppercase tracking-wide">
              {documentTitle}
            </h1>
            <span className="text-right text-[9px]">
              {printCopyLabel(copy)}
              {isMultiPage ? ` - Page ${pageIndex + 1} of ${pageCount}` : ""}
            </span>
          </div>
        </header>

        <BillingDocumentHeader />

        {addressMode === "billing_and_shipping" ? (
          <section className="space-y-1 border-b border-slate-300 px-1.5 py-1.5 text-[10px]">
            <PurchaseDocumentDetails purchase={purchase} showWorkOrder={showWorkOrder} />
          </section>
        ) : null}

        <section
          className={`grid border-b border-slate-300 text-[10px] ${
            addressMode === "billing_only" ? "sm:grid-cols-[51.5%_48.5%]" : "sm:grid-cols-2"
          }`}
        >
          <div className="px-1.5 py-1.5">
            <div className="font-medium">Supplier (Bill to)</div>
            <div className="mt-1 font-semibold">M/s. {purchase.supplierName}</div>
            <div className="mt-1 whitespace-pre-wrap">
              {purchase.billingAddress || "Address not set"}
            </div>
            <div className="mt-1 grid grid-cols-[max-content_1fr] gap-x-1">
              <span>GSTIN/UIN :</span>
              <span>{purchase.supplierGstin || "-"}</span>
              <span>State Name :</span>
              <span>-</span>
            </div>
          </div>
          <div className="border-t border-slate-300 px-1.5 py-1.5 sm:border-l sm:border-slate-300 sm:border-t-0">
            {addressMode === "billing_only" ? (
              <div className="space-y-1">
                <PurchaseDocumentDetails purchase={purchase} showWorkOrder={showWorkOrder} />
              </div>
            ) : (
              <>
                <div className="font-medium">Supplier (Ship to)</div>
                <div className="mt-1 font-semibold">M/s. {purchase.supplierName}</div>
                <div className="mt-1 whitespace-pre-wrap">
                  {purchase.shippingAddress || purchase.billingAddress || "Address not set"}
                </div>
                <div className="mt-1 grid grid-cols-[max-content_1fr] gap-x-1">
                  <span>GSTIN/UIN :</span>
                  <span>{purchase.supplierGstin || "-"}</span>
                  <span>State Name :</span>
                  <span>-</span>
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <table className="w-full table-fixed border-collapse text-[10px]">
            <colgroup>
              <col className="w-[4.5%]" />
              {showPo ? <col className="w-[7%]" /> : null}
              {showDc ? <col className="w-[7%]" /> : null}
              <col className="w-[39%]" />
              <col className="w-[10ch]" />
              <col className="w-[5.5%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr className="border-b-[3px] border-double border-slate-300">
                {headings.map((heading) => (
                  <th
                    key={heading}
                    className={`border-r border-slate-300 py-1 text-center font-semibold leading-tight last:border-r-0 ${
                      heading === "Particulars" ? "px-1.5 text-left" : "px-1"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageIndex > 0 ? (
                <PurchasePrintPageTotalRow
                  items={purchase.items.slice(0, items[0]?.index ?? 0)}
                  label="Carried forward"
                  leadingColumnCount={3 + Number(showPo) + Number(showDc)}
                  showContinuation={false}
                />
              ) : null}
              {items.map(({ item, index }, pageItemIndex) => (
                <PurchasePrintItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  isFirst={pageItemIndex === 0}
                  showColour={showColour}
                  showDc={showDc}
                  showPo={showPo}
                  showSize={showSize}
                />
              ))}
              {Array.from({ length: blankLines }).map((_, index) => (
                <PurchasePrintBlankRow
                  key={`blank-${pageIndex}-${index}`}
                  columnCount={headings.length}
                />
              ))}
              {isLastPage ? (
                <PurchasePrintTotalRow
                  purchase={purchase}
                  leadingColumnCount={3 + Number(showPo) + Number(showDc)}
                />
              ) : (
                <PurchasePrintPageTotalRow
                  items={items.map(({ item }) => item)}
                  leadingColumnCount={3 + Number(showPo) + Number(showDc)}
                />
              )}
            </tbody>
          </table>
        </section>

        {isLastPage ? (
          <>
            <section className="border-t border-slate-300">
              <div className="grid grid-cols-[1fr_12rem]">
                <div className="border-r border-slate-300 px-1.5 py-0.5 text-[9px] leading-3">
                  <div className="font-medium">E&amp;OE</div>
                  <div className="mt-0.5">
                    We hereby certify that our registration under the GST Act 2017 is in force on
                    the date on which purchase of goods specified in this document is made by us and
                    the purchase is effected in the regular course of business.
                  </div>
                  <div className="mt-0.5 font-semibold">
                    * Goods once sold will not be taken back unless agreed in writing.
                  </div>
                  {bankAccount ? <PurchasePrintBankDetails bankAccount={bankAccount} /> : null}
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
                  <PrintTotal
                    borderBottom={false}
                    label="Round Off"
                    value={money(purchase.roundOff)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_12rem] border-t border-slate-300">
                <div className="flex flex-wrap items-baseline gap-x-1 border-r border-slate-300 px-1.5 py-0.5 text-[9px] leading-3">
                  <span className="shrink-0 font-medium">Amount (in words):</span>
                  <span className="min-w-0 flex-1">{amountInWords(purchase.amount)}</span>
                </div>
                <PrintTotal label="GRAND TOTAL" strong value={money(purchase.amount)} />
              </div>
            </section>
            <section className="grid min-h-[4.5rem] grid-cols-[1fr_18rem] border-t border-slate-300">
              <div className="flex items-end border-r border-slate-300 px-1.5 py-0.5 text-[9px]">
                <div>Receiver Sign</div>
              </div>
              <div className="grid grid-rows-[1fr_auto] px-1.5 py-0.5 text-[9px]">
                <div className="font-semibold">
                  For <BillingCompanyName />
                </div>
                <div className="font-semibold">Authorised Signatory</div>
              </div>
            </section>
            <footer className="border-t border-slate-300 px-1.5 py-1 text-[9px]">
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
  isFirst,
  showColour,
  showDc,
  showPo,
  showSize
}: {
  item: Purchase["items"][number];
  index: number;
  isFirst: boolean;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
}) {
  const { primary: primaryParticulars, variant: variantParticulars } = purchasePrintParticulars(
    item,
    showColour,
    showSize
  );

  return (
    <tr
      className={`h-[33px] align-top ${isFirst ? "[&>td]:pb-[1.5px] [&>td]:pt-[5px]" : "[&>td]:py-[1.5px]"}`}
    >
      <td className="border-r border-slate-300 px-1 text-center">{index + 1}</td>
      {showPo ? (
        <td className="border-r border-slate-300 px-1 text-center">{item.poNo || "-"}</td>
      ) : null}
      {showDc ? (
        <td className="border-r border-slate-300 px-1 text-center">{item.dcNo || "-"}</td>
      ) : null}
      <td className="whitespace-normal break-words border-r border-slate-300 px-1 [overflow-wrap:anywhere]">
        <div className="font-medium text-[10px] leading-[11px]">{primaryParticulars}</div>
        {variantParticulars ? (
          <div className="pl-2 text-[9px] leading-[10px]">{variantParticulars}</div>
        ) : null}
      </td>
      <td className="border-r border-slate-300 px-1 text-center">{item.hsnCode || "-"}</td>
      <td className="border-r border-slate-300 px-1 text-center">{item.quantity}</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.rate)}</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.taxableAmount)}</td>
      <td className="border-r border-slate-300 px-1 text-center">{item.taxRate}%</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.taxAmount)}</td>
      <td className="px-1 text-right">{money(item.lineTotal)}</td>
    </tr>
  );
}

function purchasePrintParticulars(
  item: Purchase["items"][number],
  showColour: boolean,
  showSize: boolean
) {
  return {
    primary: [item.productName, item.description].filter(hasDisplayValue).join(" - "),
    variant: [
      showColour && hasDisplayValue(item.colour) ? "Colour : " + item.colour : "",
      showSize && hasDisplayValue(item.size) ? "Size : " + item.size : ""
    ]
      .filter(hasDisplayValue)
      .join(" - ")
  };
}

function PurchasePrintBlankRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="h-[11px]">
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className={index === columnCount - 1 ? "" : "border-r border-slate-300"} />
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
      <td
        className="border-r border-slate-300 px-1.5 py-1.5 text-right"
        colSpan={leadingColumnCount}
      >
        Total
      </td>
      <td className="border-r border-slate-300 px-1.5 py-1.5 text-center">
        {purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
      </td>
      <td className="border-r border-slate-300 px-1.5 py-1.5" />
      <td className="border-r border-slate-300 px-1.5 py-1.5 text-right">
        {money(purchase.subtotal)}
      </td>
      <td className="border-r border-slate-300 px-1.5 py-1.5" />
      <td className="border-r border-slate-300 px-1.5 py-1.5 text-right">
        {money(purchase.taxAmount)}
      </td>
      <td className="px-1.5 py-1.5 text-right">{money(purchase.amount)}</td>
    </tr>
  );
}

function PurchasePrintPageTotalRow({
  items,
  label = "Page total",
  leadingColumnCount,
  showContinuation = true
}: {
  items: Purchase["items"];
  label?: string;
  leadingColumnCount: number;
  showContinuation?: boolean;
}) {
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const taxableAmount = items.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0);
  const taxAmount = items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
  const lineTotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  return (
    <>
      <tr className="border-t border-slate-300 font-semibold">
        <td className="border-r border-slate-300 px-1 py-1 text-right" colSpan={leadingColumnCount}>
          {label}
        </td>
        <td className="border-r border-slate-300 px-1 py-1 text-center">{quantity}</td>
        <td className="border-r border-slate-300 px-1 py-1" />
        <td className="border-r border-slate-300 px-1 py-1 text-right">{money(taxableAmount)}</td>
        <td className="border-r border-slate-300 px-1 py-1" />
        <td className="border-r border-slate-300 px-1 py-1 text-right">{money(taxAmount)}</td>
        <td className="px-1 py-1 text-right">{money(lineTotal)}</td>
      </tr>
      {showContinuation ? (
        <tr>
          <td
            className="border-t border-slate-300 px-1 py-1 text-right font-semibold"
            colSpan={leadingColumnCount + 6}
          >
            To be continued...
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PrintPair({ children, label }: { children: string; label: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-2">
      <span>{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

function PurchaseDocumentDetails({
  purchase,
  showWorkOrder
}: {
  purchase: Purchase;
  showWorkOrder: boolean;
}) {
  return (
    <>
      <PrintPair label="Purchase No:">{purchase.invoiceNumber}</PrintPair>
      <PrintPair label="Date:">{formatDate(purchase.issuedOn)}</PrintPair>
      <PrintPair label="Supplier Bill No:">{purchase.supplierBillNo || "-"}</PrintPair>
      <PrintPair label="Supplier Bill Date:">
        {purchase.supplierBillDate ? formatDate(purchase.supplierBillDate) : "-"}
      </PrintPair>
      {showWorkOrder ? (
        <PrintPair label="Work Order:">{purchase.workOrderNo || "-"}</PrintPair>
      ) : null}
    </>
  );
}

function PurchasePrintBankDetails({
  bankAccount
}: {
  bankAccount: CompanyRecord["bankAccounts"][number];
}) {
  return (
    <div className="mt-1.5">
      <div className="font-semibold">Bank Details</div>
      <div className="mt-0.5 grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] gap-x-2">
        {hasDisplayValue(bankAccount.bankName) ? (
          <>
            <span>Bank</span>
            <span className="col-span-3 font-semibold">{bankAccount.bankName}</span>
          </>
        ) : null}
        {hasDisplayValue(bankAccount.holderName) ? (
          <>
            <span>A/c Name</span>
            <span className="col-span-3 font-semibold">{bankAccount.holderName}</span>
          </>
        ) : null}
        <span>A/c No.</span>
        <span className="font-semibold">{bankAccount.accountNumber}</span>
        <span>{hasDisplayValue(bankAccount.accountType) ? "Type" : ""}</span>
        <span className="font-semibold">{bankAccount.accountType || ""}</span>
        {hasDisplayValue(bankAccount.branch) ? (
          <>
            <span>Branch</span>
            <span className="font-semibold">{bankAccount.branch}</span>
          </>
        ) : null}
        {hasDisplayValue(bankAccount.ifsc) ? (
          <>
            <span>IFSC</span>
            <span className="font-semibold">{bankAccount.ifsc}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function hasDisplayValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized && normalized !== "-");
}

function PrintTotal({
  borderBottom = true,
  label,
  strong,
  value
}: {
  borderBottom?: boolean;
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-x-3 px-1.5 py-1 ${borderBottom ? "border-b border-slate-300" : ""} ${strong ? "h-full items-center text-[10px] font-bold" : ""}`}
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
  return formatMoney(value).replace("Ã¢â€šÂ¹", "").trim();
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
