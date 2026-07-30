import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
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
        title="Invoices, accounts, staff activity, and digital documents belong behind controlled access."
        summary={`This page describes the public product-information boundary for ${portal.brandName}. Exact company policies, retention periods, and deployment controls should be confirmed through the responsible service contact.`}
      />
      <section className="tenant-page-section tenant-prose">
        <article>
          <span>01</span>
          <div>
            <h2>Public product information</h2>
            <p>
              These pages explain billing features, product experience, security approach, guides,
              and updates. Reading this material does not require access to business records.
            </p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h2>Account sign-in</h2>
            <p>
              Customer, item, invoice, e-way bill, e-invoice, receipt, payment, ledger, report, and
              staff activity data begins only after authorised sign-in.
            </p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h2>Staff responsibility</h2>
            <p>
              Visibility and actions should follow each employee&apos;s business responsibility.
              Access can be changed when staff join, leave, or move without removing the
              company&apos;s document history.
            </p>
          </div>
        </article>
        <article>
          <span>04</span>
          <div>
            <h2>Connected communication and providers</h2>
            <p>
              Mail, messaging, payment, storage, compliance, and other connected providers may
              process information under their own policies. Connections should be approved and
              configured by authorised administrators.
            </p>
          </div>
        </article>
        <article>
          <span>05</span>
          <div>
            <h2>Light AI assistance</h2>
            <p>
              AI-assisted preparation should respect staff access, label estimates or generated
              suggestions, and require human confirmation before important financial actions.
            </p>
          </div>
        </article>
        <article>
          <span>06</span>
          <div>
            <h2>Retention, backup, and support access</h2>
            <p>
              Exact retention periods, backup schedules, restore objectives, infrastructure regions,
              and support-access rules depend on the deployed service arrangement and should be
              confirmed before production use.
            </p>
          </div>
        </article>
      </section>
      <section className="tenant-page-section tenant-legal-note">
        <ShieldCheck />
        <div>
          <span>Need a clearer control view?</span>
          <h2>See how staff access, document checks, and activity support safer billing.</h2>
        </div>
        <Link to="/security">
          Billing controls <ArrowRight />
        </Link>
      </section>
    </>
  );
}
