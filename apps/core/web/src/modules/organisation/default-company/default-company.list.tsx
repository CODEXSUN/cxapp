import { Building2, CalendarDays, LayoutGrid } from "lucide-react";
import { Button, WorkspaceStatusBadge } from "@codexsun/ui";
import type { DefaultCompanyRecord } from "./default-company.types";
export function DefaultCompanyList({
  onEdit,
  record
}: {
  onEdit: () => void;
  record: DefaultCompanyRecord | null;
}) {
  if (!record)
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-medium">No default company configured.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the single startup default for this tenant.
        </p>
        <Button className="mt-4" onClick={onEdit}>
          Configure default
        </Button>
      </div>
    );
  const rows = [
    { icon: Building2, label: "Company", title: record.companyName, subtitle: record.companyCode },
    {
      icon: CalendarDays,
      label: "Accounting year",
      title: record.financialYearName,
      subtitle: `${format(record.financialYearStartDate)} to ${format(record.financialYearEndDate)}`
    },
    {
      icon: LayoutGrid,
      label: "Landing app",
      title: label(record.landingApp),
      subtitle: "Opens first when the tenant dashboard loads."
    }
  ];
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="font-semibold">Startup Default</h3>
          <div className="mt-1">
            <WorkspaceStatusBadge
              label={record.status === "active" ? "Active" : "Inactive"}
              tone={record.status === "active" ? "success" : "neutral"}
            />
          </div>
        </div>
        <Button variant="outline" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {rows.map((item) => (
        <div key={item.label} className="grid gap-3 border-b px-5 py-5 sm:grid-cols-[12rem_1fr]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <item.icon className="size-4" />
            {item.label}
          </div>
          <div>
            <div className="font-semibold">{item.title}</div>
            <div className="text-sm text-muted-foreground">{item.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function format(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
        date
      );
}
function label(value: string) {
  return value
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
