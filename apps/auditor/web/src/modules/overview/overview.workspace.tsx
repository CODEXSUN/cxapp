import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  FileSearch,
  Scale,
  ShieldCheck
} from "lucide-react";
import { Card } from "@cxapp/ui/components/card";

const workflowStages = [
  {
    description: "Define the engagement, period, responsibilities, and review scope.",
    icon: ClipboardCheck,
    title: "Plan and scope"
  },
  {
    description: "Collect working papers and supporting evidence with a clear source trail.",
    icon: FileSearch,
    title: "Evidence and working papers"
  },
  {
    description: "Record exceptions, findings, responses, and accepted operational risk.",
    icon: AlertTriangle,
    title: "Exceptions and findings"
  },
  {
    description: "Complete reviewer sign-off and preserve the final audit trail.",
    icon: BadgeCheck,
    title: "Review and sign-off"
  }
] as const;

const coverageAreas = [
  ["Transaction review", "Sales and purchase audit centres"],
  ["Compliance", "GST reconciliation and statutory checkpoints"],
  ["Controls", "Evidence, findings, responses, and period locks"],
  ["Reporting", "Audit reports, trails, and review status"]
] as const;

export function AuditorOverviewWorkspace() {
  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="relative min-h-40 p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-indigo-100 via-violet-50 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-indigo-600 text-white">
                <ShieldCheck className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Auditor</p>
                <h1 className="mt-1 text-3xl font-semibold">Auditor Desk</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  A governed workspace for audit planning, evidence, exceptions, compliance review,
                  and sign-off.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-900">
              <Scale className="size-4" />
              Workspace foundation ready
            </span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Audit workflow</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The side menu is organised around the complete audit lifecycle. Business modules will be
          enabled as their database and permission contracts are delivered.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workflowStages.map((stage, index) => (
          <Card className="p-5" key={stage.title}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-indigo-50 text-indigo-700">
                <stage.icon className="size-5" />
              </span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-5 font-semibold">{stage.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.description}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Planned coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These areas define the menu and module boundaries for the Auditor app.
          </p>
        </div>
        <div className="grid md:grid-cols-2">
          {coverageAreas.map(([label, description]) => (
            <div
              className="flex gap-4 border-b px-5 py-4 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
              key={label}
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-indigo-600" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
