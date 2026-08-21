import { Link } from "@tanstack/react-router";
import { ArrowRight, Database, Link2, LockKeyhole, ShieldCheck } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantPrivacyPage() {
  return (
    <TenantSiteTemplate activePage="privacy" pageTitle="Privacy">
      <PrivacyPageContent />
    </TenantSiteTemplate>
  );
}

function PrivacyPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Business data privacy"
        summary={`This page explains the public product-information boundary for ${portal.brandName}. Exact retention, backup, region, and support-access terms depend on the service arrangement.`}
        title="Public information outside. Business records behind controlled access."
        visual="privacy"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="The practical boundary"
          title="Keep access understandable and data use accountable."
        />
        <div className="tenant-simple-grid is-four">
          <article>
            <ShieldCheck />
            <span>Public and private</span>
            <h3>Marketing pages do not expose business records.</h3>
            <p>Customer, billing, accounts, mail, and staff data begin after authorised sign-in.</p>
          </article>
          <article>
            <LockKeyhole />
            <span>Responsibility</span>
            <h3>Access follows the work a person is trusted to do.</h3>
            <p>Administrators should update access when staff join, leave, or change roles.</p>
          </article>
          <article>
            <Link2 />
            <span>Connected providers</span>
            <h3>External services keep their own policies.</h3>
            <p>Mail, payment, storage, compliance, and messaging connections need approval.</p>
          </article>
          <article>
            <Database />
            <span>Retention and support</span>
            <h3>Deployment details should be confirmed before production use.</h3>
            <p>Review retention, backup, restore, region, and authorised support access.</p>
          </article>
        </div>
      </section>
      <section className="tenant-page-note is-teal">
        <ShieldCheck />
        <div>
          <span>Need the control view?</span>
          <h2>See how tenant isolation, staff access, and activity support safer work.</h2>
        </div>
        <Link to="/security">
          Security <ArrowRight />
        </Link>
      </section>
    </>
  );
}
