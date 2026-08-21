import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, FileCheck2, KeyRound, UserRoundCheck } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantTermsPage() {
  return (
    <TenantSiteTemplate activePage="terms" pageTitle="Terms">
      <TermsPageContent />
    </TenantSiteTemplate>
  );
}

function TermsPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Application terms"
        summary={`These baseline terms cover ${portal.brandName} public pages and authenticated application use. Commercial, deployment, and support terms may be provided separately.`}
        title="Clear responsibility for access, data, and final financial decisions."
        visual="terms"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="Plain working terms"
          title="People remain responsible for important business actions."
        />
        <div className="tenant-simple-grid is-four">
          <article>
            <KeyRound />
            <span>Authorised access</span>
            <h3>Accounts are for approved users and assigned responsibilities.</h3>
            <p>Do not share passwords or use transferred personal credentials for handover.</p>
          </article>
          <article>
            <FileCheck2 />
            <span>Financial accuracy</span>
            <h3>Review the document before completing the action.</h3>
            <p>Users check customer, item, tax, total, payment, and compliance information.</p>
          </article>
          <article>
            <UserRoundCheck />
            <span>Staff changes</span>
            <h3>Administrators keep access current.</h3>
            <p>Change or remove permissions when people join, leave, or move roles.</p>
          </article>
          <article>
            <Bot />
            <span>Services and automation</span>
            <h3>Connected tools have limits and need review.</h3>
            <p>Important automated or assisted financial actions remain subject to approval.</p>
          </article>
        </div>
      </section>
      <section className="tenant-page-note is-gold">
        <FileCheck2 />
        <div>
          <span>Need a specific answer?</span>
          <h2>Use the contact route for product, deployment, support, or commercial questions.</h2>
        </div>
        <Link to="/contact">
          Contact <ArrowRight />
        </Link>
      </section>
    </>
  );
}
