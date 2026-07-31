import { Button } from "@cxapp/ui/components/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@cxapp/ui/components/dialog";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { WorkspaceFormBanner } from "@cxapp/ui/workspace/upsert";
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
import {
  type QuotationDecimalInput,
  type QuotationSavePayload,
  type QuotationTaxType
} from "./quotation.types";

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
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [validationError, setValidationError] = useState("");
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
    if (next.name !== undefined) setValidationError("");
    setForm((current) => ({ ...current, ...next }));
  }

  function submitProduct() {
    setSaveAttempted(true);
    if (!form.name.trim()) {
      setValidationError("Product name is required.");
      return;
    }
    const openingRate = String(form.openingRate).trim();
    if (openingRate && (!Number.isFinite(Number(openingRate)) || Number(openingRate) < 0)) {
      setValidationError("Opening price must be a valid non-negative decimal.");
      return;
    }
    setValidationError("");
    void onSave(form).catch((error: unknown) =>
      setValidationError(error instanceof Error ? error.message : "Unable to save product.")
    );
  }

  async function createOption(
    kind: "productCategories" | "hsnCodes" | "units" | "taxes",
    name: string
  ) {
    const value = name.trim();
    const taxRate = kind === "taxes" ? parseTaxRate(value) : null;
    if (kind === "taxes" && taxRate === null) {
      const error = new Error("Enter a valid non-negative GST tax rate.");
      setValidationError(error.message);
      throw error;
    }
    const payload =
      kind === "hsnCodes"
        ? { code: value.toUpperCase(), description: value, isActive: true }
        : kind === "taxes"
          ? {
              description: String(taxRate),
              isActive: true,
              ratePercent: taxRate
            }
          : { isActive: true, name: value };
    const created = await createQuotationLookup(kind, payload).catch((error: unknown) => {
      setValidationError(
        error instanceof Error ? error.message : "Unable to create the selected lookup."
      );
      throw error;
    });
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
    return kind === "taxes" ? { ...created, name: taxRateLabel(created) } : created;
  }

  const categoryOptions = (categoriesQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    value: String(record.id)
  }));
  const hsnOptions = (hsnCodesQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    label: record.code || record.name || record.id,
    value: String(record.id)
  }));
  const unitOptions = (unitsQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    value: String(record.id)
  }));
  const taxOptions = (taxesQuery.data ?? []).map((record) => ({
    ...quotationCommonOption(record),
    label: taxRateLabel(record),
    value: String(record.id)
  }));

  return (
    <form
      className="grid gap-0"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submitProduct();
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        {validationError ? (
          <WorkspaceFormBanner className="mb-0 sm:col-span-2" title="Unable to save product">
            {validationError}
          </WorkspaceFormBanner>
        ) : null}
        <ContactQuickField
          invalid={saveAttempted && !form.name.trim()}
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
          inputMode="decimal"
          invalid={
            saveAttempted &&
            Boolean(
              String(form.openingRate).trim() &&
              (!Number.isFinite(Number(form.openingRate)) || Number(form.openingRate) < 0)
            )
          }
          label="Opening price"
          type="text"
          value={String(form.openingRate)}
          onChange={(openingRate) => patchProduct({ openingRate })}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button disabled={loading} type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          <Save className="size-4" />
          Save product
        </Button>
      </DialogFooter>
    </form>
  );
}

function parseTaxRate(value: string) {
  const parsed = Number(value.replace(/gst/gi, "").replace(/%/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function taxRateLabel(record: QuotationLookupRecord) {
  const rate = Number(record.ratePercent ?? record.taxRate);
  if (rate < 0 || record.description?.trim() === "-") return "-";
  return Number.isFinite(rate) ? `${rate}%` : "-";
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
        onCreate={async (name) => {
          const record = await onCreate(sanitize ? sanitize(name) : name);
          return { ...quotationCommonOption(record), value: String(record.id) };
        }}
        onValueChange={onValueChange}
      />
    </label>
  );
}

export function quotationDecimalValue(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeQuotationLine(
  item: QuotationSavePayload["items"][number],
  taxType: QuotationTaxType
) {
  const taxableAmount = quotationDecimalValue(item.quantity) * quotationDecimalValue(item.rate);
  const taxAmount = (taxableAmount * quotationDecimalValue(item.taxRate)) / 100;
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
  value: QuotationDecimalInput;
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
