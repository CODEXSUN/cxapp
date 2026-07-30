import { ArrowRight, Calculator, ReceiptText, TrendingUp, UsersRound } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { TenantGrowthPathSection } from "../sections/growth-path.section";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantAboutPage() {
  return (
    <TenantSiteTemplate activePage="about" pageTitle="About">
      <AboutPageContent />
    </TenantSiteTemplate>
  );
}

function AboutPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow={`About ${portal.brandName}`}
        title="Built for businesses that need billing to stay simple as operations grow."
        summary="CODEXSUN is designed around the work behind every sale: accurate documents, clear accounts, timely follow-up, responsible staff access, and records that remain understandable later."
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
      />
      <section className="tenant-page-section tenant-principle-grid">
        <article>
          <ReceiptText />
          <h3>Make daily billing feel natural</h3>
          <p>
            Keep the common invoice path obvious while advanced detail waits until it is needed.
          </p>
        </article>
        <article>
          <Calculator />
          <h3>Make accuracy part of the workflow</h3>
          <p>
            Use reusable records, visible totals, validation, status, and review instead of memory.
          </p>
        </article>
        <article>
          <UsersRound />
          <h3>Make staff change less disruptive</h3>
          <p>Keep responsibility, pending work, documents, and history clear as people change.</p>
        </article>
      </section>
      <section className="tenant-page-section tenant-story-panel">
        <span>Our product belief</span>
        <h2>Business software should carry complexity without passing it to every user.</h2>
        <p>
          Start with an easy invoice, extend into e-way bills and e-invoices, connect accounts, and
          add deeper automation while the everyday experience remains calm and recognisable.
        </p>
      </section>
      <section className="tenant-page-section tenant-audience-section">
        <TenantSectionHeading
          eyebrow="Made for the people behind the numbers"
          title="One product experience, shaped around the different responsibilities in a billing office."
          summary="Sales staff need speed, accounts staff need accuracy, and owners need a clear view of what is complete, pending, overdue, or exceptional."
        />
        <div className="tenant-audience-grid">
          <article>
            <ReceiptText />
            <span>Billing staff</span>
            <h3>Create and continue documents without losing momentum.</h3>
            <p>
              Keep customers, items, tax, totals, e-way bills, e-invoices, print, and sharing inside
              a learnable daily rhythm.
            </p>
          </article>
          <article>
            <Calculator />
            <span>Accounts staff</span>
            <h3>Connect money movement to the documents that created it.</h3>
            <p>
              Review receipts, payments, outstanding balances, ledgers, reports, and exceptions with
              the source transaction close by.
            </p>
          </article>
          <article>
            <TrendingUp />
            <span>Business owners</span>
            <h3>Understand daily performance without waiting for manual summaries.</h3>
            <p>
              Follow sales, collections, overdue work, document status, and staff activity through a
              concise operating view.
            </p>
          </article>
        </div>
      </section>
      <TenantGrowthPathSection />
      <TenantPortalCta />
    </>
  );
}
