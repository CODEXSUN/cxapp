import { WorkspaceFormField, WorkspaceSelect } from "@cxapp/ui/workspace";

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
].map((label, index) => ({ label, value: String(index + 1) }));

export function GstStatementForm({
  availableYears,
  month,
  onMonthChange,
  onYearChange,
  year
}: {
  availableYears: number[];
  month: number | undefined;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
  year: number | undefined;
}) {
  return (
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 shadow-sm md:grid-cols-2">
      <WorkspaceFormField label="Month">
        <WorkspaceSelect
          ariaLabel="GST statement month"
          onValueChange={(value) => onMonthChange(Number(value))}
          options={monthOptions}
          placeholder="Select month"
          value={month ? String(month) : ""}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Year">
        <WorkspaceSelect
          ariaLabel="GST statement year"
          onValueChange={(value) => onYearChange(Number(value))}
          options={availableYears.map((value) => ({ label: String(value), value: String(value) }))}
          placeholder="Select year"
          value={year ? String(year) : ""}
        />
      </WorkspaceFormField>
    </div>
  );
}
