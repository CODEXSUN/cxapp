import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WorkspacePrintSheet } from "@cxapp/ui/workspace/print";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@cxapp/ui/components/card";
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
  const companyBranding = useCompanyBranding(sale?.companyId ?? null);

  useEffect(() => {
    if (
      !autoPrint ||
      !sale ||
      settingsQuery.isLoading ||
      companyBranding.isLoading ||
      autoPrintTriggered.current
    )
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
  }, [autoPrint, companyBranding.isLoading, sale, settingsQuery.isLoading]);

  function togglePrintCopy(copy: SalePrintCopy) {
    setPrintCopies((current) =>
      !current.includes(copy)
        ? [...current, copy]
        : current.length === 1
          ? current
          : current.filter((value) => value !== copy)
    );
  }

  if (saleQuery.isLoading || settingsQuery.isLoading || companyBranding.isLoading) {
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
  const documentTitle = useBillingDocumentTitle("sales");
  const company = useCompanyBranding(sale.companyId).company;
  const addressMode = billingSettings?.printing.addressMode ?? "billing_and_shipping";
  const showPo = billingSettings?.layout.usePo ?? false;
  const showDc = billingSettings?.layout.useDc ?? false;
  const showColour = billingSettings?.layout.useColour ?? false;
  const showSize = billingSettings?.layout.useSize ?? false;
  const showWorkOrder = billingSettings?.layout.useWorkOrder ?? true;
  const showEinvoiceDetails =
    (billingSettings?.layout.useEinvoice ?? false) && hasEinvoicePrintData(sale);
  const primaryBankAccount =
    billingSettings?.printing.printAccountNumber === true
      ? (company?.bankAccounts.find(
          (account) => account.isPrimary && hasDisplayValue(account.accountNumber)
        ) ?? null)
      : null;
  const statesQuery = useQuery({
    queryFn: () => listSaleLocations("states"),
    queryKey: ["billing", "sale", "print", "states"]
  });
  const billingAddress = formatPrintAddress(sale.billingAddress, statesQuery.data ?? []);
  const shippingAddress = formatPrintAddress(
    sale.shippingAddress || sale.billingAddress,
    statesQuery.data ?? []
  );
  const pages = paginateBillingPrintItems(sale.items);

  return (
    <WorkspacePrintSheet className="billing-print-document">
      {pages.map((items, pageIndex) => (
        <SalePrintPage
          key={`sale-print-page-${pageIndex}`}
          copy={copy}
          documentTitle={documentTitle}
          items={items}
          isLastPage={pageIndex === pages.length - 1}
          isMultiPage={pages.length > 1}
          pageIndex={pageIndex}
          pageCount={pages.length}
          addressMode={addressMode}
          bankAccount={primaryBankAccount}
          billingAddress={billingAddress}
          shippingAddress={shippingAddress}
          showColour={showColour}
          showDc={showDc}
          showEinvoiceDetails={showEinvoiceDetails}
          showPo={showPo}
          showSize={showSize}
          showWorkOrder={showWorkOrder}
          sale={sale}
        />
      ))}
    </WorkspacePrintSheet>
  );
}

function SalePrintPage({
  copy,
  documentTitle,
  items,
  isLastPage,
  isMultiPage,
  pageIndex,
  pageCount,
  addressMode,
  bankAccount,
  billingAddress,
  shippingAddress,
  showColour,
  showDc,
  showEinvoiceDetails,
  showPo,
  showSize,
  showWorkOrder,
  sale
}: {
  copy: SalePrintCopy;
  documentTitle: string;
  items: Array<{ item: Sale["items"][number]; index: number }>;
  isLastPage: boolean;
  isMultiPage: boolean;
  pageIndex: number;
  pageCount: number;
  addressMode: "billing_only" | "billing_and_shipping";
  bankAccount: CompanyRecord["bankAccounts"][number] | null;
  billingAddress: { address: string; state: string };
  shippingAddress: { address: string; state: string };
  showColour: boolean;
  showDc: boolean;
  showEinvoiceDetails: boolean;
  showPo: boolean;
  showSize: boolean;
  showWorkOrder: boolean;
  sale: Sale;
}) {
  const splitTax = sale.taxType === "cgst-sgst";
  const blankLines = getBillingPrintDummyLineCount(
    items.map(({ item }) => salePrintParticulars(item, showColour, showSize))
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
          <section className="grid border-b border-slate-300 text-[10px] sm:grid-cols-2">
            <div
              className={`space-y-1 px-1.5 py-1.5 ${showEinvoiceDetails ? "" : "sm:col-span-2"}`}
            >
              <SaleDocumentDetails sale={sale} showWorkOrder={showWorkOrder} />
            </div>
            {showEinvoiceDetails ? (
              <div className="border-l border-slate-300 px-1.5 py-1.5">
                <EinvoiceDetails sale={sale} />
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          className={`grid border-b border-slate-300 text-[10px] ${
            addressMode === "billing_only" ? "sm:grid-cols-[51.5%_48.5%]" : "sm:grid-cols-2"
          }`}
        >
          <div className="min-h-[5rem] px-1.5 py-1">
            <div className="font-medium">
              {addressMode === "billing_only" ? "Consignee (Bill to)" : "Buyer (Bill to)"}
            </div>
            <div className="mt-1 text-[11px] font-semibold tracking-wide">
              M/s. {sale.customerName}
            </div>
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
          {addressMode === "billing_and_shipping" ? (
            <div className="min-h-[5rem] border-l border-slate-300 px-1.5 py-1">
              <div className="font-medium">Buyer (Ship to)</div>
              <div className="mt-1 text-[11px] font-semibold tracking-wide">
                M/s. {sale.customerName}
              </div>
              <div className="mt-1 whitespace-pre-wrap">
                {shippingAddress.address || "Address not set"}
              </div>
              <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2">
                <span>GSTIN/UIN</span>
                <span>-</span>
                <span>State Name</span>
                <span>{shippingAddress.state || "-"}</span>
              </div>
            </div>
          ) : (
            <div className="min-h-[5rem] border-l border-slate-300 px-1.5 py-1">
              <div className="space-y-1">
                <SaleDocumentDetails sale={sale} showWorkOrder={showWorkOrder} />
              </div>
              {showEinvoiceDetails ? (
                <div className="mt-2 border-t border-slate-300 pt-2">
                  <EinvoiceDetails sale={sale} />
                </div>
              ) : null}
            </div>
          )}
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
                <SalePrintPageTotalRow
                  items={sale.items.slice(0, items[0]?.index ?? 0)}
                  label="Carried forward"
                  leadingColumnCount={3 + Number(showPo) + Number(showDc)}
                  showContinuation={false}
                />
              ) : null}
              {items.map(({ item, index }, pageItemIndex) => (
                <SalePrintItemRow
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
                <SalePrintBlankRow
                  key={`blank-${pageIndex}-${index}`}
                  columnCount={headings.length}
                />
              ))}
              {isLastPage ? (
                <SalePrintTotalRow
                  sale={sale}
                  leadingColumnCount={3 + Number(showPo) + Number(showDc)}
                />
              ) : (
                <SalePrintPageTotalRow
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
                  <div>
                    We hereby certify that our registration under the GST Act 2017 is in force on
                    the date on which sale of goods specified in this invoice is made by us and the
                    sale is effected in the regular course of business.
                  </div>
                  <div className="mt-0.5 font-semibold">
                    * Goods once sold will not be taken back unless agreed in writing.
                  </div>
                  {bankAccount ? <SalePrintBankDetails bankAccount={bankAccount} /> : null}
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
                  <PrintTotal borderBottom={false} label="Round Off" value={money(sale.roundOff)} />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_12rem] border-t border-slate-300">
                <div className="flex flex-wrap items-baseline gap-x-1 border-r border-slate-300 px-1.5 py-0.5 text-[9px] leading-3">
                  <span className="shrink-0 font-medium">Amount (in words):</span>
                  <span className="min-w-0 flex-1">{amountInWords(sale.amount)}</span>
                </div>
                <PrintTotal label="GRAND TOTAL" strong value={money(sale.amount)} />
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

function SalePrintItemRow({
  item,
  index,
  isFirst,
  showColour,
  showDc,
  showPo,
  showSize
}: {
  item: Sale["items"][number];
  index: number;
  isFirst: boolean;
  showColour: boolean;
  showDc: boolean;
  showPo: boolean;
  showSize: boolean;
}) {
  const { primary: primaryParticulars, variant: variantParticulars } = salePrintParticulars(
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
        <td className="break-words border-r border-slate-300 px-1 text-center">
          {hasDisplayValue(item.poNo) ? item.poNo : ""}
        </td>
      ) : null}
      {showDc ? (
        <td className="break-words border-r border-slate-300 px-1 text-center">
          {hasDisplayValue(item.dcNo) ? item.dcNo : ""}
        </td>
      ) : null}
      <td className="whitespace-normal break-words border-r border-slate-300 px-1.5 [overflow-wrap:anywhere]">
        <div className="font-medium text-[10px] leading-[11px]">{primaryParticulars}</div>
        {variantParticulars ? (
          <div className="pl-2 text-[9px] leading-[10px]">{variantParticulars}</div>
        ) : null}
      </td>
      <td className="whitespace-nowrap border-r border-slate-300 px-1 text-center">
        {hasDisplayValue(item.hsnCode) ? item.hsnCode : ""}
      </td>
      <td className="border-r border-slate-300 px-1 text-center">{item.quantity}</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.rate)}</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.taxableAmount)}</td>
      <td className="border-r border-slate-300 px-1 text-center">{item.taxRate}%</td>
      <td className="border-r border-slate-300 px-1 text-right">{money(item.taxAmount)}</td>
      <td className="px-1 text-right">{money(item.lineTotal)}</td>
    </tr>
  );
}

function salePrintParticulars(item: Sale["items"][number], showColour: boolean, showSize: boolean) {
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

function SalePrintBlankRow({ columnCount }: { columnCount: number }) {
  return (
    <tr className="h-[11px]">
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className={index === columnCount - 1 ? "" : "border-r border-slate-300"} />
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
      <td className="whitespace-nowrap border-r border-slate-300 px-1.5 py-1 text-left" colSpan={2}>
        E&amp;OE
      </td>
      <td
        className="border-r border-slate-300 px-1 py-1 text-right"
        colSpan={leadingColumnCount - 2}
      >
        Total
      </td>
      <td className="border-r border-slate-300 px-1 py-1 text-center">
        {sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
      </td>
      <td className="border-r border-slate-300 px-1 py-1" />
      <td className="border-r border-slate-300 px-1 py-1 text-right">{money(sale.subtotal)}</td>
      <td className="border-r border-slate-300 px-1 py-1" />
      <td className="border-r border-slate-300 px-1 py-1 text-right">{money(sale.taxAmount)}</td>
      <td className="px-1 py-1 text-right">{money(sale.amount)}</td>
    </tr>
  );
}

function SalePrintPageTotalRow({
  items,
  label = "Page total",
  leadingColumnCount,
  showContinuation = true
}: {
  items: Sale["items"];
  label?: string;
  leadingColumnCount: number;
  showContinuation?: boolean;
}) {
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const taxable = items.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0);
  const tax = items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
  const total = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  return (
    <>
      <tr className="border-t border-slate-300 font-semibold">
        <td className="border-r border-slate-300 px-1 py-1 text-right" colSpan={leadingColumnCount}>
          {label}
        </td>
        <td className="border-r border-slate-300 px-1 py-1 text-center">{quantity}</td>
        <td className="border-r border-slate-300 px-1 py-1" />
        <td className="border-r border-slate-300 px-1 py-1 text-right">{money(taxable)}</td>
        <td className="border-r border-slate-300 px-1 py-1" />
        <td className="border-r border-slate-300 px-1 py-1 text-right">{money(tax)}</td>
        <td className="px-1 py-1 text-right">{money(total)}</td>
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

function hasDisplayValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized && normalized !== "-");
}

function PrintPair({
  children,
  label,
  valueClassName = ""
}: {
  children: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-2">
      <span>{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{children}</span>
    </div>
  );
}

function SaleDocumentDetails({ sale, showWorkOrder }: { sale: Sale; showWorkOrder: boolean }) {
  return (
    <>
      <PrintPair label="Invoice No:" valueClassName="text-[11px]">
        {sale.invoiceNumber || sale.saleNumber}
      </PrintPair>
      <PrintPair label="Date:">{formatDate(sale.issuedOn)}</PrintPair>
      {showWorkOrder ? <PrintPair label="Work Order:">{sale.workOrderNo || "-"}</PrintPair> : null}
    </>
  );
}

function EinvoiceDetails({ sale }: { sale: Sale }) {
  const hasIrn = hasDisplayValue(sale.einvoice.irn);
  const hasAckNo = hasDisplayValue(sale.einvoice.ackNo);
  const hasAckDate = hasDisplayValue(sale.einvoice.ackDate);
  const hasEwayBillNo = hasDisplayValue(sale.eway.billNo);
  const hasEwayBillDate = hasDisplayValue(sale.eway.billDate);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-1">
      {hasIrn ? (
        <>
          <span className="whitespace-nowrap font-semibold">IRN :</span>
          <span className="col-span-3 break-all font-semibold">{sale.einvoice.irn.trim()}</span>
        </>
      ) : null}
      {hasAckNo ? (
        <>
          <span className="whitespace-nowrap font-semibold">Ack No.:</span>
          <span className="font-semibold">{sale.einvoice.ackNo.trim()}</span>
        </>
      ) : null}
      {hasAckDate ? (
        <>
          <span
            className={`whitespace-nowrap text-right font-semibold ${hasAckNo ? "" : "col-start-3"}`}
          >
            Ack Date:
          </span>
          <span className="text-right font-semibold">{formatDate(sale.einvoice.ackDate)}</span>
        </>
      ) : null}
      {hasEwayBillNo ? (
        <>
          <span className="whitespace-nowrap font-semibold">E-Way Bill No.:</span>
          <span className="font-semibold">{sale.eway.billNo.trim()}</span>
        </>
      ) : null}
      {hasEwayBillDate ? (
        <>
          <span
            className={`whitespace-nowrap text-right font-semibold ${hasEwayBillNo ? "" : "col-start-3"}`}
          >
            Date:
          </span>
          <span className="text-right font-semibold">{formatDate(sale.eway.billDate)}</span>
        </>
      ) : null}
    </div>
  );
}

function hasEinvoicePrintData(sale: Sale) {
  return [
    sale.einvoice.irn,
    sale.einvoice.ackNo,
    sale.einvoice.ackDate,
    sale.eway.billNo,
    sale.eway.billDate
  ].some(hasDisplayValue);
}

function SalePrintBankDetails({
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
        {hasDisplayValue(bankAccount.accountType) ? (
          <>
            <span>Type</span>
            <span className="font-semibold">{bankAccount.accountType}</span>
          </>
        ) : (
          <>
            <span />
            <span />
          </>
        )}
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

function printCopyLabel(copy: SalePrintCopy) {
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
