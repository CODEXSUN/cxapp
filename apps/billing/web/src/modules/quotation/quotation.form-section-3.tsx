import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { ArrowUpRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { type BillingDocumentLayoutSettings } from "../settings/settings.types";
import {
  RoundOffRow,
  TotalRow,
  computeQuotationLine,
  computeQuotationTotals,
  numericId
} from "./quotation.form-section-4";
import {
  formatMoney,
  type QuotationLookupOption,
  type QuotationLookupRecord
} from "./quotation.services";
import { type QuotationSavePayload, type QuotationTaxType } from "./quotation.types";

export function QuotationItemsSection({
  colourOptions,
  coloursLoading,
  draft,
  editing,
  items,
  productOptions,
  productsLoading,
  resetSignal,
  settings,
  sizeOptions,
  sizesLoading,
  taxType,
  roundOff,
  roundOffManual,
  suggestedRoundOff,
  onAdd,
  onCreateColour,
  onCreateProduct,
  onCreateSize,
  renderProductCreateForm,
  onDraftChange,
  onEditProduct,
  onEdit,
  onProductSelect,
  onRoundOffChange,
  onRemove,
  onResetRoundOff,
  onReset
}: {
  colourOptions: QuotationLookupOption[];
  coloursLoading: boolean;
  draft: QuotationSavePayload["items"][number];
  editing: boolean;
  items: QuotationSavePayload["items"];
  productOptions: QuotationLookupOption[];
  productsLoading: boolean;
  resetSignal: number;
  settings: BillingDocumentLayoutSettings;
  sizeOptions: QuotationLookupOption[];
  sizesLoading: boolean;
  taxType: QuotationTaxType;
  roundOff: number;
  roundOffManual: boolean;
  suggestedRoundOff: number;
  onAdd: () => void;
  onCreateColour: (name: string) => Promise<QuotationLookupOption | undefined>;
  onCreateProduct: (name: string) => Promise<QuotationLookupOption | undefined>;
  onCreateSize: (name: string) => Promise<QuotationLookupOption | undefined>;
  renderProductCreateForm: (context: {
    initialName: string;
    onCancel: () => void;
    onCreated: (option: QuotationLookupOption) => void;
  }) => ReactNode;
  onDraftChange: (next: Partial<QuotationSavePayload["items"][number]>) => void;
  onEditProduct: (record: QuotationLookupRecord) => void;
  onEdit: (index: number) => void;
  onProductSelect: (value: string, option?: QuotationLookupOption | null) => void;
  onRoundOffChange: (value: string) => void;
  onRemove: (index: number) => void;
  onResetRoundOff: () => void;
  onReset: () => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const showPo = settings.usePo;
  const showDc = settings.useDc;
  const showColour = settings.useColour;
  const showSize = settings.useSize;
  const splitTax = taxType === "cgst-sgst";
  const totals = computeQuotationTotals(items, taxType);
  const grandTotal = totals.amount + roundOff;
  const templateColumns = [
    ...(showPo ? ["minmax(6.5rem,0.7fr)"] : []),
    ...(showDc ? ["minmax(6.5rem,0.7fr)"] : []),
    "minmax(16rem,2fr)",
    "minmax(14rem,1.2fr)",
    ...(showColour ? ["minmax(7rem,0.8fr)"] : []),
    ...(showSize ? ["minmax(7rem,0.8fr)"] : []),
    "minmax(6rem,0.7fr)",
    "minmax(7rem,0.7fr)",
    "auto"
  ].join(" ");

  useEffect(() => {
    if (!resetSignal) return;
    window.requestAnimationFrame(() => {
      rowRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
    });
  }, [resetSignal]);

  return (
    <div className="mt-8 px-0 pb-0 pt-5">
      <div>
        <h3 className="text-lg font-semibold tracking-normal text-foreground underline decoration-foreground/70 underline-offset-4">
          Quotation Items
        </h3>
        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1 pt-1.5">
          <div className="min-w-[980px]">
            <div
              ref={rowRef}
              className="grid gap-1"
              style={{ gridTemplateColumns: templateColumns }}
            >
              {showPo ? (
                <Field label="PO">
                  <Input
                    value={draft.poNo}
                    onChange={(event) => onDraftChange({ poNo: event.target.value })}
                  />
                </Field>
              ) : null}
              {showDc ? (
                <Field label="DC">
                  <Input
                    value={draft.dcNo}
                    onChange={(event) => onDraftChange({ dcNo: event.target.value })}
                  />
                </Field>
              ) : null}
              <Field label="Product name">
                <WorkspaceLookup
                  createDescription="Add a product without leaving this quotation."
                  createLabel="New product"
                  createMode="popup"
                  createTitle="New product"
                  emptyLabel="No products found. Create a new product."
                  loading={productsLoading}
                  options={productOptions}
                  placeholder="Search product"
                  value={draft.productName}
                  onTextChange={(value) => onDraftChange({ productName: value })}
                  onValueChange={(value, option) =>
                    onProductSelect(value, option as QuotationLookupOption | null | undefined)
                  }
                  onCreate={onCreateProduct}
                  renderCreateForm={renderProductCreateForm}
                  trailingAction={
                    productOptions.find(
                      (option) =>
                        option.value === draft.productName || option.label === draft.productName
                    )?.record ? (
                      <button
                        aria-label="Edit selected product"
                        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Edit selected product"
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          const record = productOptions.find(
                            (option) =>
                              option.value === draft.productName ||
                              option.label === draft.productName
                          )?.record;
                          if (record) onEditProduct(record);
                        }}
                      >
                        <ArrowUpRight className="size-4" />
                      </button>
                    ) : undefined
                  }
                />
              </Field>
              <Field label="Description">
                <Input
                  value={draft.description}
                  onChange={(event) => onDraftChange({ description: event.target.value })}
                />
              </Field>
              {showColour ? (
                <Field label="Colour">
                  <WorkspaceLookup
                    createLabel="Create colour"
                    createMode="inline"
                    emptyLabel="No colours found. Type a value to create it."
                    loading={coloursLoading}
                    options={colourOptions}
                    placeholder="Search colour"
                    value={draft.colour}
                    onTextChange={(value) => onDraftChange({ colour: value, colourId: null })}
                    onValueChange={(value, option) =>
                      onDraftChange({
                        colour: option?.label ?? value,
                        colourId: numericId(
                          (option as QuotationLookupOption | undefined)?.record?.id
                        )
                      })
                    }
                    onCreate={onCreateColour}
                  />
                </Field>
              ) : null}
              {showSize ? (
                <Field label="Size">
                  <WorkspaceLookup
                    createLabel="Create size"
                    createMode="inline"
                    emptyLabel="No sizes found. Type a value to create it."
                    loading={sizesLoading}
                    options={sizeOptions}
                    placeholder="Search size"
                    value={draft.size}
                    onTextChange={(value) => onDraftChange({ size: value, sizeId: null })}
                    onValueChange={(value, option) =>
                      onDraftChange({
                        size: option?.label ?? value,
                        sizeId: numericId((option as QuotationLookupOption | undefined)?.record?.id)
                      })
                    }
                    onCreate={onCreateSize}
                  />
                </Field>
              ) : null}
              <Field label="Quantity">
                <Input
                  className="text-center"
                  inputMode="numeric"
                  type="text"
                  value={String(draft.quantity)}
                  onChange={(event) => onDraftChange({ quantity: Number(event.target.value || 0) })}
                />
              </Field>
              <Field label="Price">
                <Input
                  className="text-right"
                  inputMode="decimal"
                  type="text"
                  value={String(draft.rate)}
                  onChange={(event) => onDraftChange({ rate: Number(event.target.value || 0) })}
                />
              </Field>
              <div className="flex items-end gap-2 pb-0.5">
                <Button
                  className="h-11 rounded-md bg-blue-600 px-4 text-white shadow-sm hover:bg-blue-700"
                  type="button"
                  onClick={onAdd}
                >
                  <Plus className="size-4" />
                  {editing ? "Update" : "Add"}
                </Button>
                {editing ? (
                  <Button
                    aria-label="Cancel item edit"
                    className="size-11 rounded-md p-0"
                    title="Cancel item edit"
                    type="button"
                    variant="outline"
                    onClick={onReset}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-md border border-border/70">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                {[
                  "#",
                  ...(showPo ? ["PO"] : []),
                  ...(showDc ? ["DC"] : []),
                  "Particulars",
                  "HSN Code",
                  ...(showColour ? ["Colour"] : []),
                  ...(showSize ? ["Size"] : []),
                  "Qty",
                  "Rate",
                  "Unit",
                  "Taxable",
                  "GST %",
                  ...(splitTax ? ["CGST", "SGST"] : ["IGST"]),
                  "Total",
                  "Action"
                ].map((heading) => (
                  <th
                    key={heading}
                    className={cn(
                      "border-b border-r border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground last:border-r-0",
                      heading === "Particulars" ? "text-left" : "text-center"
                    )}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const line = computeQuotationLine(item, taxType);
                return (
                  <tr
                    key={`${item.productName}-${index}`}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <td className="border-r border-border/70 px-3 py-2">{index + 1}</td>
                    {showPo ? (
                      <td className="border-r border-border/70 px-3 py-2">{item.poNo || "-"}</td>
                    ) : null}
                    {showDc ? (
                      <td className="border-r border-border/70 px-3 py-2">{item.dcNo || "-"}</td>
                    ) : null}
                    <td className="border-r border-border/70 px-3 py-2">
                      {[item.productName, item.description].filter(Boolean).join(" - ")}
                    </td>
                    <td className="border-r border-border/70 px-3 py-2 text-center">
                      {item.hsnCode || "-"}
                    </td>
                    {showColour ? (
                      <td className="border-r border-border/70 px-3 py-2">{item.colour || "-"}</td>
                    ) : null}
                    {showSize ? (
                      <td className="border-r border-border/70 px-3 py-2">{item.size || "-"}</td>
                    ) : null}
                    <td className="border-r border-border/70 px-3 py-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="border-r border-border/70 px-3 py-2 text-right">
                      {formatMoney(item.rate)}
                    </td>
                    <td className="border-r border-border/70 px-3 py-2">{item.unit || "Nos"}</td>
                    <td className="border-r border-border/70 px-3 py-2 text-right">
                      {formatMoney(line.taxableAmount)}
                    </td>
                    <td className="border-r border-border/70 px-3 py-2 text-center">
                      {item.taxRate}%
                    </td>
                    {splitTax ? (
                      <>
                        <td className="border-r border-border/70 px-3 py-2 text-right">
                          {formatMoney(line.cgstAmount)}
                        </td>
                        <td className="border-r border-border/70 px-3 py-2 text-right">
                          {formatMoney(line.sgstAmount)}
                        </td>
                      </>
                    ) : (
                      <td className="border-r border-border/70 px-3 py-2 text-right">
                        {formatMoney(line.igstAmount)}
                      </td>
                    )}
                    <td className="border-r border-border/70 px-3 py-2 text-right font-semibold">
                      {formatMoney(line.lineTotal)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="rounded-md border border-border/70 p-1.5 text-muted-foreground hover:bg-muted"
                          type="button"
                          onClick={() => onEdit(index)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                          type="button"
                          onClick={() => onRemove(index)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                    colSpan={
                      11 +
                      (showPo ? 1 : 0) +
                      (showDc ? 1 : 0) +
                      (showColour ? 1 : 0) +
                      (showSize ? 1 : 0) +
                      (splitTax ? 2 : 1)
                    }
                  >
                    Add quotation items to see them here.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="grid w-full max-w-[25rem] gap-3 text-sm">
            <TotalRow label="Taxable amount" value={formatMoney(totals.taxableAmount)} />
            <TotalRow label="GST total" value={formatMoney(totals.taxAmount)} />
            <RoundOffRow
              manual={roundOffManual}
              suggestedValue={suggestedRoundOff}
              value={roundOff}
              onChange={onRoundOffChange}
              onReset={onResetRoundOff}
            />
            <TotalRow label="Grand total" strong value={formatMoney(grandTotal)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  children,
  label,
  required
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-muted-foreground">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {children}
    </label>
  );
}
