import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { cn } from "@cxapp/ui/lib/utils";
import { WorkspaceLookup } from "@cxapp/ui/workspace/lookup";
import { exportSaleCommonOption } from "./export-sales.form-section-2";
import {
  formatMoney,
  type ExportSaleLookupOption,
  type ExportSaleLookupRecord
} from "./export-sales.services";
import { type ExportSaleSavePayload, type ExportSaleTaxType } from "./export-sales.types";

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
  onCreate: (name: string) => Promise<ExportSaleLookupRecord>;
  onValueChange: (value: string, option?: ExportSaleLookupOption | null) => void;
  options: ExportSaleLookupOption[];
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
          exportSaleCommonOption(await onCreate(sanitize ? sanitize(name) : name))
        }
        onValueChange={onValueChange}
      />
    </label>
  );
}

export function computeExportSaleLine(
  item: ExportSaleSavePayload["items"][number],
  taxType: ExportSaleTaxType
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

export function computeExportSaleTotals(
  items: ExportSaleSavePayload["items"],
  taxType: ExportSaleTaxType
) {
  return items.reduce(
    (totals, item) => {
      const line = computeExportSaleLine(item, taxType);
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
  const id = Number(value ?? 0);
  return Number.isInteger(id) && id > 0 ? id : null;
}
