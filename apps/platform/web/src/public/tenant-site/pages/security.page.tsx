import { Activity, ArrowRight, BadgeCheck, LockKeyhole, UsersRound } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantSecurityPage() {
  return (
    <TenantSiteTemplate activePage="security" pageTitle="Security">
      <SecurityPageContent />
    </TenantSiteTemplate>
  );
}

function SecurityPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Sign in securely <ArrowRight />
          </a>
        }
        eyebrow="Practical business control"
        summary="Keep public information separate from business records, give staff only the access they need, and retain a useful activity trail."
        title="Security that fits the way people work."
        visual="security"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="Control without friction"
          title="The right person sees the right work at the right time."
        />
        <div className="tenant-simple-grid is-four">
          <article>
            <LockKeyhole />
            <span>Tenant isolation</span>
            <h3>Each business workspace keeps its own records.</h3>
            <p>
              Customer, billing, accounts, mail, and staff data stay inside the tenant boundary.
            </p>
          </article>
          <article>
            <UsersRound />
            <span>Role-based access</span>
            <h3>Access follows responsibility.</h3>
            <p>Billing, accounts, reports, review, and administration can remain separate.</p>
          </article>
          <article>
            <BadgeCheck />
            <span>Checks before action</span>
            <h3>Important gaps appear before a document moves.</h3>
            <p>Required details, totals, status, and review points stay visible.</p>
          </article>
          <article>
            <Activity />
            <span>Activity history</span>
            <h3>Important changes remain easier to explain.</h3>
            <p>Creation, updates, approvals, and lifecycle actions keep useful context.</p>
          </article>
        </div>
      </section>
      <TenantPortalCta
        title="Give staff a faster workflow without giving up control."
        summary="Sign in to continue with the documents and actions assigned to your account."
      />
    </>
  );
}
