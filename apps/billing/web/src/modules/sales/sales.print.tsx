import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WorkspacePrintSheet } from "@codexsun/ui/workspace/print";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@codexsun/ui/components/card";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { PageTitle } from "../../shared/document/PageTitle";
import { BillingCompanyName, BillingDocumentHeader, useBillingSettings } from "../settings";
import { useSaleRecord } from "./sales.hooks";
import {
  formatDate,
  formatMoney,
  listSaleLocations,
  type SaleLocationRecord
} from "./sales.services";
import type { Sale } from "./sales.types";

export type SalePrintCopy = "duplicate" | "office-copy" | "original";

export function SalesPrintRoutePage() {
  const search = new URLSearchParams(window.location.search);
  const saleId = search.get("id");
  const autoPrint = search.get("autoprint") === "1";
  const saleQuery = useSaleRecord(saleId, true);
  const settingsQuery = useBillingSettings();
  const autoPrintTriggered = useRef(false);
  const [printCopies, setPrintCopies] = useState<readonly SalePrintCopy[]>(["original"]);
  const sale = saleQuery.data;

  useEffect(() => {
    if (!autoPrint || !sale || settingsQuery.isLoading || autoPrintTriggered.current) return;
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
  }, [autoPrint, sale, settingsQuery.isLoading]);

  function togglePrintCopy(copy: SalePrintCopy) {
    setPrintCopies((current) =>
      !current.includes(copy)
        ? [...current, copy]
        : current.length === 1
          ? current
          : current.filter((value) => value !== copy)
    );
  }

  if (saleQuery.isLoading || settingsQuery.isLoading) {
    return <GlobalLoader />;
  }

  return (
    <WorkspacePage
      className="billing-document-print-page"
      title={sale ? `${sale.saleNumber} print` : "Sales print"}
      description="Printable sales document."
      actions={
        <div className="flex gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button type="button" variant="outline" onClick={() => void saleQuery.refetch()}>
            <RefreshCw className={saleQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
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
        <PageTitle title="Sales Print" />
      </div>
      {sale ? (
        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 overflow-x-auto">
            <div className="grid min-w-fit justify-center gap-6">
              {printCopies.map((copy) => (
                <div key={copy}>
                  <SalePrintDocument copy={copy} sale={sale} />
                </div>
              ))}
            </div>
          </div>
          <Card className="h-fit rounded-md border-border/70 shadow-sm print:hidden xl:sticky xl:top-4 xl:mt-4">
            <CardHeader className="border-b border-border/70 px-4 py-3">
              <CardTitle className="text-sm">Print copies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {printCopyOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={printCopies.includes(option.value)}
                    onChange={() => togglePrintCopy(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          Sale print record was not found.
        </div>
      )}
    </WorkspacePage>
  );
}

const printCopyOptions: Array<{ label: string; value: SalePrintCopy }> = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "office-copy" }
];

export function SalePrintDocument({ copy, sale }: { copy: SalePrintCopy; sale: Sale }) {
  const billingSettings = useBillingSettings().data;
  const addressMode = billingSettings?.printing.addressMode ?? "billing_and_shipping";
  const showPo = billingSettings?.layout.usePo ?? false;
  const showDc = billingSettings?.layout.useDc ?? false;
  const showColour = billingSettings?.layout.useColour ?? false;
  const showSize = billingSettings?.layout.useSize ?? false;
  const statesQuery = useQuery({
    queryFn: () => listSaleLocations("states"),
    queryKey: ["billing", "sale", "print", "states"]
  });
  const billingAddress = formatPrintAddress(sale.billingAddress, statesQuery.data ?? []);
  const shippingAddress = formatPrintAddress(
    sale.shippingAddress || sale.billingAddress,
    statesQuery.data ?? []
  );
  const pages = chunkItems(sale.items, 12);

  return (
    <WorkspacePrintSheet className="billing-print-document">
      {pages.map((items, pageIndex) => (
        <SalePrintPage
          key={`sale-print-page-${pageIndex}`}
          copy={copy}
          items={items}
          isLastPage={pageIndex === pages.length - 1}
          isMultiPage={pages.length > 1}
          pageIndex={pageIndex}
          pageCount={pages.length}
          addressMode={addressMode}
          billingAddress={billingAddress}
          shippingAddress={shippingAddress}
          showColour={showColour}
          showDc={showDc}
          showPo={showPo}
          showSize={showSize}
          sale={sale}
        />
      ))}
    </WorkspacePrintSheet>
  );
}

function SalePrintPage({
  copy,
  items,
  isLastPage,
  isMultiPage,
  pageIndex,
  pageCount,
  addressMode,
  billingAddress,
  shippingAddress,
  showColour,
  showDc,
  showPo,
  showSize,
  sale
}: {
  copy: SalePrintCopy;
  items: Array<{ item: Sale["items"][number]; index: number }>;
  isLastPage: boolean;
  isMultiPage: boolean;
  pageIndex: number;
  pageCount: number;
  addressMode: "billing_only" | "billing_and_shipping";
  billingAddress: { address: string; state: string };
  shippingAddress: { address: string; state: string };
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
  sale: Sale;
}) {
  const splitTax = sale.taxType === "cgst-sgst";
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
            <h1 className="text-center text-[11px] font-semibold tracking-wide">TAX INVOICE</h1>
            <span className="text-right text-[9px]">
              {printCopyLabel(copy)}
              {isMultiPage ? ` - Page ${pageIndex + 1} of ${pageCount}` : ""}
            </span>
          </div>
        </header>

        <BillingDocumentHeader />

        {addressMode === "billing_and_shipping" ? (
          <section className="space-y-1 border-b border-slate-300 px-2 py-2 text-[10px]">
            <PrintPair label="Invoice No:">{sale.invoiceNumber || sale.saleNumber}</PrintPair>
            <PrintPair label="Date:">{formatDate(sale.issuedOn)}</PrintPair>
            <PrintPair label="Work Order:">{sale.workOrderNo || "-"}</PrintPair>
          </section>
        ) : null}

        <section className="grid border-b border-slate-300 text-[10px] sm:grid-cols-2">
          <div className="min-h-[7.75rem] px-2 py-2">
            <div className="font-medium">Buyer (Bill to)</div>
            <div className="mt-1 font-semibold">M/s. {sale.customerName}</div>
            <div className="mt-1 whitespace-pre-wrap">
              {billingAddress.address || "Address not set"}
            </div>
            <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2">
              <span>GSTIN/UIN</span>
              <span>-</span>
              <span>State Name</span>
              <span>{billingAddress.state || "-"}</span>
            </div>
          </div>
          <div className="min-h-[7.75rem] border-l border-slate-300 px-2 py-2">
            {addressMode === "billing_only" ? (
              <DocumentDetails
                number={sale.saleNumber}
                date={formatDate(sale.issuedOn)}
                workOrder={sale.workOrderNo}
              />
            ) : (
              <>
                <div className="font-medium">Buyer (Ship to)</div>
                <div className="mt-1 font-semibold">M/s. {sale.customerName}</div>
                <div className="mt-1 whitespace-pre-wrap">
                  {shippingAddress.address || "Address not set"}
                </div>
                <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2">
                  <span>GSTIN/UIN</span>
                  <span>-</span>
                  <span>State Name</span>
                  <span>{shippingAddress.state || "-"}</span>
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
              <col />
              <col className="w-[10ch]" />
              <col className="w-[5.5%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-300">
                {headings.map((heading) => (
                  <th
                    key={heading}
                    className={`border-r border-slate-300 py-2 text-center font-semibold last:border-r-0 ${
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
                <SalePrintItemRow
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
                <SalePrintBlankRow
                  key={`blank-${pageIndex}-${index}`}
                  columnCount={headings.length}
                />
              ))}
              {isLastPage ? (
                <SalePrintTotalRow
                  sale={sale}
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
                  <div className="mt-1">{amountInWords(sale.amount)}</div>
                </div>
              </div>
              <div className="text-[9px]">
                <PrintTotal label="Taxable Value" value={money(sale.subtotal)} />
                {splitTax ? (
                  <>
                    <PrintTotal label="Total CGST" value={money(sale.taxAmount / 2)} />
                    <PrintTotal label="Total SGST" value={money(sale.taxAmount / 2)} />
                  </>
                ) : (
                  <PrintTotal label="Total IGST" value={money(sale.taxAmount)} />
                )}
                <PrintTotal label="Total GST" value={money(sale.taxAmount)} />
                <PrintTotal label="Round Off" value={money(sale.roundOff)} />
                <PrintTotal label="GRAND TOTAL" strong value={money(sale.amount)} />
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

function SalePrintItemRow({
  item,
  index,
  showColour,
  showDc,
  showPo,
  showSize
}: {
  item: Sale["items"][number];
  index: number;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
}) {
  const particulars = [item.productName, item.description].filter(hasDisplayValue).join(" - ");

  return (
    <tr className="align-top">
      <td className="border-r border-slate-200 px-1 py-2 text-center">{index + 1}</td>
      {showPo ? (
        <td className="break-words border-r border-slate-200 px-1 py-2 text-center">
          {hasDisplayValue(item.poNo) ? item.poNo : ""}
        </td>
      ) : null}
      {showDc ? (
        <td className="break-words border-r border-slate-200 px-1 py-2 text-center">
          {hasDisplayValue(item.dcNo) ? item.dcNo : ""}
        </td>
      ) : null}
      <td className="break-words border-r border-slate-200 px-1.5 py-2 leading-4">
        <div className="font-medium">{particulars}</div>
      </td>
      <td className="whitespace-nowrap border-r border-slate-200 px-1 py-2 text-center">
        {hasDisplayValue(item.hsnCode) ? item.hsnCode : ""}
      </td>
      {showColour ? (
        <td className="break-words border-r border-slate-200 px-1 py-2 text-center">
          {hasDisplayValue(item.colour) ? item.colour : ""}
        </td>
      ) : null}
      {showSize ? (
        <td className="break-words border-r border-slate-200 px-1 py-2 text-center">
          {hasDisplayValue(item.size) ? item.size : ""}
        </td>
      ) : null}
      <td className="border-r border-slate-200 px-1 py-2 text-center">{item.quantity}</td>
      <td className="border-r border-slate-200 px-1 py-2 text-right">{money(item.rate)}</td>
      <td className="border-r border-slate-200 px-1 py-2 text-right">
        {money(item.taxableAmount)}
      </td>
      <td className="border-r border-slate-200 px-1 py-2 text-center">{item.taxRate}%</td>
      <td className="border-r border-slate-200 px-1 py-2 text-right">{money(item.taxAmount)}</td>
      <td className="px-1 py-2 text-right">{money(item.lineTotal)}</td>
    </tr>
  );
}

function SalePrintBlankRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="h-6">
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className={index === columnCount - 1 ? "" : "border-r border-slate-200"} />
      ))}
    </tr>
  );
}

function SalePrintTotalRow({
  leadingColumnCount,
  sale
}: {
  leadingColumnCount: number;
  sale: Sale;
}) {
  return (
    <tr className="border-t border-slate-300 font-semibold">
      <td className="border-r border-slate-200 px-1 py-2 text-right" colSpan={leadingColumnCount}>
        Total
      </td>
      <td className="border-r border-slate-200 px-1 py-2 text-center">
        {sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
      </td>
      <td className="border-r border-slate-200 px-1 py-2" />
      <td className="border-r border-slate-200 px-1 py-2 text-right">{money(sale.subtotal)}</td>
      <td className="border-r border-slate-200 px-1 py-2" />
      <td className="border-r border-slate-200 px-1 py-2 text-right">{money(sale.taxAmount)}</td>
      <td className="px-1 py-2 text-right">{money(sale.amount)}</td>
    </tr>
  );
}

function hasDisplayValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized && normalized !== "-");
}

function chunkItems(items: Sale["items"], _size: number) {
  const finalPageBudget = 12;
  const continuationPageBudget = 24;
  const pages: Array<Array<{ item: Sale["items"][number]; index: number }>> = [];
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

function DocumentDetails({
  date,
  number,
  workOrder
}: {
  date: string;
  number: string;
  workOrder: string;
}) {
  return (
    <>
      <div className="font-medium">Document details</div>
      <div className="mt-2 grid grid-cols-[5rem_1fr] gap-x-2">
        <span>Invoice No</span>
        <span className="font-semibold">{number}</span>
        <span>Date</span>
        <span>{date}</span>
        <span>Work Order</span>
        <span>{workOrder || "-"}</span>
      </div>
    </>
  );
}

function formatPrintAddress(value: string, states: SaleLocationRecord[]) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const stateAndPin = [...lines].reverse().find((line) => line.includes(" - ")) ?? "";
  const [stateName = "", ...pinParts] = stateAndPin
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  const state = states.find(
    (record) => record.name.trim().toLowerCase() === stateName.toLowerCase()
  );
  const addressLines = lines.filter(
    (line) => line !== stateAndPin && line.toLowerCase() !== "india"
  );
  const address = [...addressLines, ...pinParts].filter(Boolean).join(" - ");
  const stateLabel = stateName ? `${stateName}${state?.code ? ` (${state.code})` : ""}` : "";
  return { address, state: stateLabel };
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

function printCopyLabel(copy: SalePrintCopy) {
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
