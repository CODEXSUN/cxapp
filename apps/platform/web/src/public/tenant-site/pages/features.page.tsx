import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Globe2,
  ReceiptText,
  Store,
  Workflow
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
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
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open CODEXSUN <ArrowRight />
          </a>
        }
        eyebrow="Connected capabilities"
        summary="Use the tools you need today. Add deeper records, control, and automation as the business grows."
        title="Useful business tools that work as one product."
        visual="features"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="Built for everyday problems"
          title="Fewer tabs. Less repeated entry. Clearer ownership."
        />
        <div className="tenant-simple-grid is-six">
          <article>
            <Globe2 />
            <span>Public website</span>
            <h3>Publish a clear business presence.</h3>
            <p>Present the company, services, updates, and enquiry routes in one place.</p>
          </article>
          <article>
            <Store />
            <span>Storefront</span>
            <h3>Show products without managing another system.</h3>
            <p>Turn active catalogue information into a clean customer-facing view.</p>
          </article>
          <article>
            <ReceiptText />
            <span>GST billing</span>
            <h3>Create invoices with reusable tax and product details.</h3>
            <p>Keep HSN, GST, quantities, rates, discounts, and totals easy to review.</p>
          </article>
          <article>
            <BookOpen />
            <span>Accounts</span>
            <h3>Connect money movement to its source document.</h3>
            <p>Follow receipts, payments, ledgers, balances, and outstanding work.</p>
          </article>
          <article>
            <ClipboardCheck />
            <span>Tasks and reminders</span>
            <h3>Give every follow-up a person and a due date.</h3>
            <p>Keep pending work visible instead of relying on memory or chat messages.</p>
          </article>
          <article>
            <Workflow />
            <span>Workflow automation</span>
            <h3>Let routine steps happen without hiding control.</h3>
            <p>Automate reminders and repeated checks while people approve important actions.</p>
          </article>
        </div>
      </section>
      <TenantPortalCta
        title="Start with one useful flow. Add capability when it earns its place."
        summary="CODEXSUN keeps the daily path simple while the product grows around the business."
      />
    </>
  );
}
