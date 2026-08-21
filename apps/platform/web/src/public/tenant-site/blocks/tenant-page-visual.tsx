import {
  BookOpen,
  FileCheck2,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow
} from "lucide-react";

const pageVisuals = {
  about: {
    detail: "Business first · Built to grow",
    Icon: UsersRound,
    kicker: "Powered by AARAN SOFTWARE",
    status: "One connected product",
    title: "Software shaped around real work"
  },
  billing: {
    detail: "Invoice · E-way · E-invoice",
    Icon: ReceiptText,
    kicker: "From quotation to payment",
    status: "Checked and ready",
    title: "GST billing without double entry"
  },
  contact: {
    detail: "Documents · People · Checks",
    Icon: MessageSquareText,
    kicker: "Start with the workflow",
    status: "We listen first",
    title: "Tell us what slows the day"
  },
  features: {
    detail: "Billing · Records · Tasks",
    Icon: Workflow,
    kicker: "One business workspace",
    status: "Less repeated work",
    title: "Useful tools that work together"
  },
  privacy: {
    detail: "Access follows responsibility",
    Icon: LockKeyhole,
    kicker: "Controlled access",
    status: "Private by default",
    title: "Business records stay protected"
  },
  security: {
    detail: "Tenant · Role · Activity",
    Icon: ShieldCheck,
    kicker: "Practical control",
    status: "Right person. Right action.",
    title: "Security inside the daily workflow"
  },
  status: {
    detail: "API · Runtime · Modules",
    Icon: Sparkles,
    kicker: "Live service view",
    status: "Refresh when needed",
    title: "A clear view of availability"
  },
  stories: {
    detail: "Technology · Workflow · Growth",
    Icon: BookOpen,
    kicker: "CODEXSUN notes",
    status: "Plain, useful writing",
    title: "Ideas for working teams"
  },
  terms: {
    detail: "Review before financial action",
    Icon: FileCheck2,
    kicker: "Clear responsibility",
    status: "People remain in control",
    title: "Plain terms for business use"
  },
  updates: {
    detail: "Faster · Safer · Simpler",
    Icon: Sparkles,
    kicker: "Product direction",
    status: "Useful change only",
    title: "Clearer with every release"
  }
} as const;

export type TenantPageVisualKind = keyof typeof pageVisuals;

export function TenantPageVisual({ kind }: { kind: TenantPageVisualKind }) {
  const visual = pageVisuals[kind];
  const Icon = visual.Icon;

  return (
    <figure className={`tenant-page-object is-${kind}`}>
      <div className="tenant-page-object-card">
        <span>
          <Icon />
        </span>
        <small>{visual.kicker}</small>
        <strong>{visual.title}</strong>
        <p>{visual.detail}</p>
      </div>
      <div className="tenant-page-object-status">
        <i />
        <span>{visual.status}</span>
      </div>
      <div className="tenant-page-object-shapes" aria-hidden="true">
        <b />
        <b />
        <b />
      </div>
    </figure>
  );
}
