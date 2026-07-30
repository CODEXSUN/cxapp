import { ArrowUpRight, Bot, FileCheck2, Landmark, ReceiptText } from "lucide-react";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";

export function TenantGrowthPathSection() {
  return (
    <section className="tenant-page-section tenant-growth-section">
      <TenantSectionHeading
        eyebrow="A stronger billing journey"
        title="Start with a simple invoice. Extend the same flow to serious operational accuracy."
        summary="CODEXSUN keeps the first steps easy for new staff while adding deeper checks, accounts visibility, and automation exactly where the work needs them."
      />
      <div className="tenant-growth-path">
        <article>
          <span>01</span>
          <ReceiptText />
          <h3>Invoice</h3>
          <p>
            Create quotations and sales invoices with guided customer, item, tax, and total checks.
          </p>
          <small>Bill with ease</small>
        </article>
        <article>
          <span>02</span>
          <FileCheck2 />
          <h3>Compliance</h3>
          <p>
            Prepare e-way bills and e-invoices using organised information from the billing flow.
          </p>
          <small>Reduce repeat work</small>
        </article>
        <article>
          <span>03</span>
          <Landmark />
          <h3>Accounts</h3>
          <p>
            Connect receipts, payments, ledgers, outstanding balances, and reports to daily
            transactions.
          </p>
          <small>Close with clarity</small>
        </article>
        <article>
          <span>04</span>
          <Bot />
          <h3>Automation</h3>
          <p>Use rules, reminders, checks, and light assistance to keep repeated work accurate.</p>
          <small>
            Extend the flow <ArrowUpRight />
          </small>
        </article>
      </div>
    </section>
  );
}
