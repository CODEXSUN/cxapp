import type { ReactNode } from "react";
import { BookOpen, Layers, Landmark } from "lucide-react";
import { cn } from "@cxapp/ui/lib/utils";

export function OverviewWidget({
  children,
  className,
  description,
  title
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}) {
  return (
    <section className={cn("rounded-md border bg-card p-5 shadow-sm", className)}>
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function OverviewKpiCard({
  caption,
  icon,
  title,
  value
}: {
  caption: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <span className="grid size-11 place-items-center rounded-md bg-sky-600 text-white">
          {icon}
        </span>
      </div>
      <div className="mt-7 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

export function OverviewModulesWidget() {
  return (
    <OverviewWidget
      title="Accounts Modules"
      description="Scaffold areas planned for the Accounts workspace."
    >
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ModuleShortcut
          description="Chart of accounts and ledger structure."
          icon={<Landmark className="size-5" />}
          title="Ledgers"
        />
        <ModuleShortcut
          description="Organise accounts into standard groups."
          icon={<Layers className="size-5" />}
          title="Ledger Groups"
        />
        <ModuleShortcut
          description="Journal entries and transactional books."
          icon={<BookOpen className="size-5" />}
          title="Journal"
        />
      </div>
    </OverviewWidget>
  );
}

function ModuleShortcut({
  description,
  icon,
  title
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-28 items-start gap-3 rounded-md border bg-background p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-foreground">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}