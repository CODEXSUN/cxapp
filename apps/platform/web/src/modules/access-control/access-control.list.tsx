import { StatusBadge } from "@codexsun/ui";
import type { AccessControlOverview } from "./access-control.types";

export function AccessControlList({ data }: { data: AccessControlOverview }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <AccessTable
        title="Permissions"
        rows={data.permissions.map((item) => [item.label, item.key, item.status])}
      />
      <AccessTable
        title="Roles"
        rows={data.roles.map((item) => [
          item.label,
          item.permissionKeys.join(", ") || "-",
          item.status
        ])}
      />
      <AccessTable
        title="Users"
        rows={data.users.map((item) => [item.name, item.email, item.status])}
      />
    </div>
  );
}

function AccessTable({ rows, title }: { rows: string[][]; title: string }) {
  return (
    <section className="rounded-md border bg-card shadow-sm">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      <div className="divide-y">
        {rows.map((row) => (
          <div className="space-y-2 px-4 py-3 text-sm" key={row.join(":")}>
            <div className="font-medium">{row[0]}</div>
            <div className="text-muted-foreground">{row[1]}</div>
            <StatusBadge tone={row[2] === "active" ? "green" : "amber"}>
              {row[2] ?? "inactive"}
            </StatusBadge>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No records found.
          </div>
        ) : null}
      </div>
    </section>
  );
}
