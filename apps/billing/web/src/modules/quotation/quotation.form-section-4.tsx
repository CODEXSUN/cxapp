import { Button } from "@cxapp/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { useQuery } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ContactQuickField } from "./quotation.form-section-1";
import { quotationCommonOption } from "./quotation.form-section-2";
import {
  createQuotationLookup,
  formatMoney,
  listQuotationHsnCodes,
  listQuotationProductCategories,
  listQuotationTaxes,
  listQuotationUnits,
  type QuotationLookupOption,
  type QuotationLookupRecord,
  type QuotationMasterSavePayload
} from "./quotation.services";
import { type QuotationSavePayload, type QuotationTaxType } from "./quotation.types";

export function QuotationProductQuickForm({
  initialValue,
  loading,
  onCancel,
  onSave,
  title
}: {
  initialValue: QuotationMasterSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSave: (payload: QuotationMasterSavePayload) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initialValue);
  const categoriesQuery = useQuery({
    queryFn: listQuotationProductCategories,
    queryKey: ["billing", "quotation", "lookups", "product-categories"]
  });
  const hsnCodesQuery = useQuery({
    queryFn: listQuotationHsnCodes,
    queryKey: ["billing", "quotation", "lookups", "hsn-codes"]
  });
  const unitsQuery = useQuery({
    queryFn: listQuotationUnits,
    queryKey: ["billing", "quotation", "lookups", "units"]
  });
  const taxesQuery = useQuery({
    queryFn: listQuotationTaxes,
    queryKey: ["billing", "quotation", "lookups", "taxes"]
  });

  function patchProduct(next: Partial<QuotationMasterSavePayload>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function createOption(
    kind: "productCategories" | "hsnCodes" | "units" | "taxes",
    name: string
  ) {
    const value = name.trim();
    const payload =
      kind === "hsnCodes"
        ? { code: value.toUpperCase(), description: value, isActive: true }
        : kind === "taxes"
          ? {
              description: `GST ${Number(value.replace(/%/g, "")) || 0}%`,
              isActive: true,
              ratePercent: Number(value.replace(/%/g, "")) || 0
            }
          : { isActive: true, name: value };
    const created = await createQuotationLookup(kind, payload);
    const query = {
      productCategories: categoriesQuery,
      hsnCodes: hsnCodesQuery,
      units: unitsQuery,
      taxes: taxesQuery
    }[kind];
    await query.refetch();
    toast.success(
      `${kind === "productCategories" ? "Product category" : kind === "hsnCodes" ? "HSN code" : kind === "units" ? "Unit" : "GST tax rate"} saved`,
      { description: value }
    );
    return created;
  }

  const categoryOptions = (categoriesQuery.data ?? []).map(quotationCommonOption);
  const hsnOptions = (hsnCodesQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    label: record.code || record.name || record.id,
    value: String(record.id)
  }));
  const unitOptions = (unitsQuery.data ?? []).map(quotationCommonOption);
  const taxOptions = (taxesQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    label: record.name || record.code || `${record.ratePercent ?? record.taxRate ?? 0}%`,
    value: String(record.id)
  }));

  return (
    <form
      className="grid gap-0"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(form);
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        <ContactQuickField
          label="Product name"
          required
          value={form.name}
          onChange={(name) => patchProduct({ name })}
        />
        <ProductPopupLookup
          label="Product category"
          loading={categoriesQuery.isLoading}
          options={categoryOptions}
          value={form.productCategoryId || form.productCategoryName || ""}
          placeholder="Search product category"
          onCreate={(name) => createOption("productCategories", name)}
          onValueChange={(value, option) =>
            patchProduct({
              productCategoryId: option?.value ?? value,
              productCategoryName: option?.label ?? value
            })
          }
        />
        <ProductPopupLookup
          label="HSN code"
          loading={hsnCodesQuery.isLoading}
          options={hsnOptions}
          value={form.hsnCodeId || form.hsnCode || ""}
          placeholder="Search HSN code"
          onCreate={(name) => createOption("hsnCodes", name)}
          onValueChange={(value, option) =>
            patchProduct({ hsnCodeId: option?.value ?? value, hsnCode: option?.label ?? value })
          }
        />
        <ProductPopupLookup
          label="Units"
          loading={unitsQuery.isLoading}
          options={unitOptions}
          value={form.unitId || form.unitName || ""}
          placeholder="Search units"
          onCreate={(name) => createOption("units", name)}
          onValueChange={(value, option) =>
            patchProduct({ unitId: option?.value ?? value, unitName: option?.label ?? value })
          }
        />
        <ProductPopupLookup
          numericOnly
          label="GST tax rate"
          loading={taxesQuery.isLoading}
          options={taxOptions}
          value={form.taxId || (form.taxRate !== undefined ? String(form.taxRate) : "")}
          placeholder="Search GST tax rate"
          onCreate={(name) => createOption("taxes", name)}
          onValueChange={(value, option) => {
            const record = option?.record;
            patchProduct({
              taxId: option?.value ?? value,
              taxName: option?.label ?? value,
              taxRate: Number(record?.ratePercent ?? record?.taxRate ?? value) || 0
            });
          }}
        />
        <ContactQuickField
          label="Opening price"
          type="number"
          value={String(form.openingRate)}
          onChange={(openingRate) => patchProduct({ openingRate: Number(openingRate || 0) })}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading || !form.name.trim()} type="submit">
          <Save className="size-4" />
          Save product
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductPopupLookup({
  label,
  loading,
  numericOnly = false,
  onCreate,
  onValueChange,
  options,
  placeholder,
  value
}: {
  label: string;
  loading: boolean;
  numericOnly?: boolean;
  onCreate: (name: string) => Promise<QuotationLookupRecord>;
  onValueChange: (value: string, option?: QuotationLookupOption | null) => void;
  options: QuotationLookupOption[];
  placeholder: string;
  value: string;
}) {
  const sanitize = numericOnly
    ? (input: string) => input.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    : undefined;
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <WorkspaceLookup
        createLabel={`Create ${label.toLowerCase()}`}
        createMode="inline"
        emptyLabel={`No ${label.toLowerCase()} found. Type a value to create it.`}
        loading={loading}
        options={options}
        placeholder={placeholder}
        value={value}
        {...(sanitize ? { sanitizeInput: sanitize } : {})}
        onCreate={async (name) =>
          quotationCommonOption(await onCreate(sanitize ? sanitize(name) : name))
        }
        onValueChange={onValueChange}
      />
    </label>
  );
}

export function computeQuotationLine(
  item: QuotationSavePayload["items"][number],
  taxType: QuotationTaxType
) {
  const taxableAmount = Number(item.quantity || 0) * Number(item.rate || 0);
  const taxAmount = (taxableAmount * Number(item.taxRate || 0)) / 100;
  const igstAmount = taxType === "igst" ? taxAmount : 0;
  const cgstAmount = taxType === "cgst-sgst" ? taxAmount / 2 : 0;
  const sgstAmount = taxType === "cgst-sgst" ? taxAmount / 2 : 0;
  return {
    amount: taxableAmount + taxAmount,
    cgstAmount,
    igstAmount,
    lineTotal: taxableAmount + taxAmount,
    sgstAmount,
    taxAmount,
    taxableAmount
  };
}

export function computeQuotationTotals(
  items: QuotationSavePayload["items"],
  taxType: QuotationTaxType
) {
  return items.reduce(
    (totals, item) => {
      const line = computeQuotationLine(item, taxType);
      return {
        amount: totals.amount + line.amount,
        taxAmount: totals.taxAmount + line.taxAmount,
        taxableAmount: totals.taxableAmount + line.taxableAmount
      };
    },
    { amount: 0, taxAmount: 0, taxableAmount: 0 }
  );
}

export function computeSuggestedRoundOff(amount: number) {
  const rounded = Math.round(Number(amount || 0));
  return Number((rounded - Number(amount || 0)).toFixed(2));
}

export function TotalRow({
  label,
  strong,
  value
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-4", strong && "font-semibold")}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function RoundOffRow({
  manual,
  suggestedValue,
  value,
  onChange,
  onReset
}: {
  manual: boolean;
  suggestedValue: number;
  value: number;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_minmax(5.5rem,6.5rem)] items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Round off</span>
        <button
          className="text-xs font-medium text-orange-500 underline-offset-4 hover:text-orange-600 hover:underline"
          type="button"
          onClick={onReset}
        >
          Auto {manual ? formatSignedMoney(suggestedValue) : ""}
        </button>
      </div>
      <span className="text-muted-foreground">:</span>
      <Input
        className="h-8 rounded-md px-2 text-right text-sm"
        inputMode="decimal"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function formatSignedMoney(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMoney(value)}`;
}

export function numericId(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
