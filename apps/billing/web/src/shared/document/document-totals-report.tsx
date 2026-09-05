import { CalendarRange, X } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@cxapp/ui/components/popover";
import { WorkspaceDatePicker } from "@cxapp/ui/workspace/date-picker";
import { cn } from "@cxapp/ui/lib/utils";

export type BillingDocumentReportRecord = {
  amount: number;
  date: string;
  documentNumber: string;
  partyName: string;
  subtotal?: number;
  taxAmount?: number;
};

export type BillingDocumentTotalsViewMode = "bill" | "month" | "year";

const totalsViewOptions: Array<{ label: string; value: BillingDocumentTotalsViewMode }> = [
  { label: "Bill-wise", value: "bill" },
  { label: "Month-wise", value: "month" },
  { label: "Year-wise", value: "year" }
];

export function BillingDocumentListControls({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onTotalsViewChange,
  totalsView
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onTotalsViewChange: (value: BillingDocumentTotalsViewMode) => void;
  totalsView: BillingDocumentTotalsViewMode;
}) {
  const hasDateRange = Boolean(dateFrom || dateTo);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "h-8 rounded-md border-border/80 bg-white px-3 text-sm shadow-none",
              hasDateRange && "border-primary/40 bg-primary/5 text-primary"
            )}
            type="button"
            variant="outline"
          >
            <CalendarRange className="size-4" />
            Date range
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[23rem] rounded-md border-border/80 p-3 shadow-lg">
          <div className="grid gap-2 sm:grid-cols-2">
            <WorkspaceDatePicker
              ariaLabel="From date"
              onValueChange={(value) => {
                onDateFromChange(value);
                if (dateTo && value > dateTo) onDateToChange("");
              }}
              placeholder="From date"
              value={dateFrom}
            />
            <WorkspaceDatePicker
              ariaLabel="To date"
              onValueChange={(value) => {
                onDateToChange(value);
                if (dateFrom && value < dateFrom) onDateFromChange("");
              }}
              placeholder="To date"
              value={dateTo}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              className="h-8"
              disabled={!hasDateRange}
              onClick={() => {
                onDateFromChange("");
                onDateToChange("");
              }}
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
              Clear dates
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <div
        aria-label="Totals view"
        className="flex h-8 items-center rounded-md border border-border/80 bg-white p-0.5"
        role="group"
      >
        {totalsViewOptions.map((option) => (
          <Button
            aria-pressed={totalsView === option.value}
            className={cn(
              "h-6 rounded px-2.5 text-xs font-medium shadow-none",
              totalsView === option.value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            key={option.value}
            onClick={() => onTotalsViewChange(option.value)}
            type="button"
            variant="ghost"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function BillingDocumentTotalsTable({
  primaryLabel = "Taxable",
  records,
  secondaryLabel = "GST",
  totalsView
}: {
  primaryLabel?: string;
  records: BillingDocumentReportRecord[];
  secondaryLabel?: string;
  totalsView: Exclude<BillingDocumentTotalsViewMode, "bill">;
}) {
  const rows = buildRows(records, totalsView);

  return (
    <>
      <thead className="bg-muted/50">
        <tr>
          {[
            totalsView === "month" ? "Month" : "Year",
            "Documents",
            primaryLabel,
            secondaryLabel,
            "Total"
          ].map((heading) => (
            <th
              className={cn(
                "border-b border-border/70 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                [primaryLabel, secondaryLabel, "Total"].includes(heading)
                  ? "text-right"
                  : "text-left"
              )}
              key={heading}
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className="border-b border-border/70 last:border-b-0 hover:bg-muted/20" key={row.key}>
            <td className="px-4 py-2.5 font-medium">{row.label}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{row.count}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{money(row.subtotal)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{money(row.taxAmount)}</td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
              {money(row.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function buildRows(
  records: BillingDocumentReportRecord[],
  totalsView: Exclude<BillingDocumentTotalsViewMode, "bill">
) {
  const groups = new Map<
    string,
    { amount: number; count: number; label: string; subtotal: number; taxAmount: number }
  >();

  for (const record of records) {
    const key = reportPeriodKey(record.date, totalsView);
    const current = groups.get(key) ?? {
      amount: 0,
      count: 0,
      label: reportPeriodLabel(key, totalsView),
      subtotal: 0,
      taxAmount: 0
    };
    current.amount += record.amount;
    current.count += 1;
    current.subtotal += record.subtotal ?? 0;
    current.taxAmount += record.taxAmount ?? 0;
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, row]) => ({ ...row, key }))
    .sort((left, right) => right.key.localeCompare(left.key));
}

function reportPeriodKey(date: string, totalsView: Exclude<BillingDocumentTotalsViewMode, "bill">) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return totalsView === "month"
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`
    : String(parsed.getFullYear());
}

function reportPeriodLabel(
  key: string,
  totalsView: Exclude<BillingDocumentTotalsViewMode, "bill">
) {
  if (key === "Unknown date" || totalsView === "year") return key;
  const [year, month] = key.split("-").map(Number);
  const parsedYear = year ?? Number.NaN;
  const parsedMonth = month ?? Number.NaN;
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth)) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(parsedYear, parsedMonth - 1, 1)
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value);
}
