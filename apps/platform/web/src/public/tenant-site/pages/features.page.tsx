import {
  Activity,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  FileText,
  Mail,
  ReceiptText,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantProductPreview } from "../blocks/tenant-product-preview";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { TenantFeaturesSection } from "../sections/features.section";
import { TenantGrowthPathSection } from "../sections/growth-path.section";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantFeaturesPage() {
  return (
    <TenantSiteTemplate activePage="features" pageTitle="Features">
      <FeaturesPageContent />
    </TenantSiteTemplate>
  );
}

function FeaturesPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Billing capabilities"
        title="A complete billing flow that stays easy at the counter and powerful behind the scenes."
        summary={`${portal.brandName} connects invoicing, e-way bills, e-invoices, accounts, staff work, digital documents, and live follow-up without making routine work feel heavy.`}
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open billing <ArrowRight />
          </a>
        }
      />
      <TenantFeaturesSection
        eyebrow="Core billing experience"
        headline="From the first quotation to the final receipt, every step stays visible and easier to check."
      />
      <section className="tenant-page-section tenant-capability-section">
        <TenantSectionHeading
          eyebrow="Beyond basic invoicing"
          title="Build an operating rhythm around accurate documents, clear responsibility, and timely action."
          summary="The product supports the daily details that decide whether billing feels controlled: reusable records, compliance documents, staff access, reminders, and an organised digital trail."
        />
        <div className="tenant-capability-grid">
          <article>
            <ReceiptText />
            <span>Invoice experience</span>
            <h3>Keep fast entry and careful review in the same flow</h3>
            <p>
              Use customer, item, price, tax, discount, numbering, payment, print, and sharing steps
              without jumping between disconnected screens.
            </p>
          </article>
          <article>
            <FileCheck2 />
            <span>Compliance flow</span>
            <h3>Prepare e-way bills and e-invoices from checked billing data</h3>
            <p>
              Reduce repeated typing, expose missing details early, and keep generation or
              submission status beside the source document.
            </p>
          </article>
          <article>
            <Mail />
            <span>Digital communication</span>
            <h3>Keep the document and the conversation together</h3>
            <p>
              Share invoices and statements, organise attachments, and retain delivery history so
              the team can understand what the customer received.
            </p>
          </article>
          <article>
            <BadgeCheck />
            <span>Staff controls</span>
            <h3>Give people clear responsibility without slowing them down</h3>
            <p>
              Shape access around sales, purchase, receipt, payment, reports, and approval work,
              then change responsibility cleanly when staff move.
            </p>
          </article>
          <article>
            <Activity />
            <span>Live monitoring</span>
            <h3>See today&apos;s work before it becomes tomorrow&apos;s problem</h3>
            <p>
              Follow invoice progress, outstanding amounts, document exceptions, staff activity, and
              pending follow-up from a readable operational view.
            </p>
          </article>
          <article>
            <Workflow />
            <span>Automation with light assistance</span>
            <h3>Automate repeated checks while people keep final control</h3>
            <p>
              Use rules, reminders, background processing, and carefully placed AI assistance for
              repetitive preparation—not for unreviewed financial decisions.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-page-section tenant-feature-preview">
        <TenantSectionHeading
          eyebrow="The product experience"
          title="Detailed enough for serious accounts. Calm enough for new staff to adopt quickly."
          summary="Important fields, status, totals, and next actions remain visible while deeper controls stay available only when the workflow reaches them."
        />
        <TenantProductPreview label="Billing capability view" />
      </section>
      <section className="tenant-page-section tenant-principle-grid">
        <article>
          <FileText />
          <h3>Reusable business data</h3>
          <p>Customers, items, taxes, prices, and terms reduce repeated entry across documents.</p>
        </article>
        <article>
          <ShieldCheck />
          <h3>Responsible staff access</h3>
          <p>People work inside the sales, purchase, accounts, or review areas assigned to them.</p>
        </article>
        <article>
          <Workflow />
          <h3>Expandable accuracy</h3>
          <p>
            Add checks, approvals, reminders, integrations, and reporting without changing the
            familiar billing foundation.
          </p>
        </article>
      </section>
      <TenantGrowthPathSection />
      <TenantPortalCta />
    </>
  );
}
