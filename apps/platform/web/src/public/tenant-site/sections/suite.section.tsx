import {
  Bot,
  ChartNoAxesCombined,
  ContactRound,
  FileText,
  Mail,
  ReceiptText,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";

const capabilities = [
  {
    description: "Tenant identity, users, roles, permissions, application access, and settings.",
    icon: ShieldCheck,
    title: "Platform & access"
  },
  {
    description: "Companies, contacts, products, tax references, addresses, and reusable masters.",
    icon: ContactRound,
    title: "Core business records"
  },
  {
    description: "Quotation, sales, purchase, receipts, payments, accounts, GST, and print flows.",
    icon: ReceiptText,
    title: "Billing & accounts"
  },
  {
    description: "Tenant mail, document sharing, delivery history, and business communication.",
    icon: Mail,
    title: "Mail & communication"
  },
  {
    description:
      "Owned work, due dates, handovers, follow-up, and clear operational responsibility.",
    icon: Workflow,
    title: "Tasks & workflow"
  },
  {
    description: "Published stories, product news, rich content, and a connected public presence.",
    icon: FileText,
    title: "Content & stories"
  },
  {
    description: "Rules, reminders, queues, checks, and assisted preparation for repeated work.",
    icon: Bot,
    title: "Practical automation"
  },
  {
    description:
      "Live status, financial follow-up, activity context, reports, and visible exceptions.",
    icon: ChartNoAxesCombined,
    title: "Reporting & visibility"
  }
] as const;

export function TenantSuiteSection() {
  return (
    <section className="tenant-page-section tenant-suite-section">
      <TenantSectionHeading
        eyebrow="The CODEXSUN product suite"
        title="Capabilities that work independently—and become stronger when they share context."
        summary="Start with the applications your team needs today. Add deeper operations and automation without moving the business into another system."
      />
      <div className="tenant-suite-grid">
        {capabilities.map(({ description, icon: Icon, title }, index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Icon />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
