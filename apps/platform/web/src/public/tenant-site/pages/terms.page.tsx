import { Link } from "@tanstack/react-router";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
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
        title="Clear responsibility for billing data, staff access, and final financial decisions."
        summary={`These baseline terms describe the ${portal.brandName} product-information pages and authenticated application use. Commercial, support, and deployment terms may be published separately.`}
      />
      <section className="tenant-page-section tenant-prose">
        <article>
          <span>01</span>
          <div>
            <h2>Public pages</h2>
            <p>
              Product pages provide general information about billing, accounts, document flows,
              staff controls, security, and product direction. They do not grant access to business
              data.
            </p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h2>Authorised application access</h2>
            <p>
              Accounts may be used only by authorised people. Available areas and actions depend on
              the responsibilities and permissions assigned to the signed-in user.
            </p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h2>Document and financial accuracy</h2>
            <p>
              Users remain responsible for checking customer, item, tax, total, transport,
              compliance, payment, and approval information before completing business actions.
            </p>
          </div>
        </article>
        <article>
          <span>04</span>
          <div>
            <h2>Staff changes</h2>
            <p>
              Administrators are responsible for updating access when employees join, leave, or
              change roles. Shared passwords and transferred personal credentials should not be used
              as a handover method.
            </p>
          </div>
        </article>
        <article>
          <span>05</span>
          <div>
            <h2>External services and automation</h2>
            <p>
              Connected mail, messaging, payment, compliance, storage, and AI providers may apply
              their own availability, limits, and data-processing rules. Important automated or
              assisted financial actions require appropriate review.
            </p>
          </div>
        </article>
        <article>
          <span>06</span>
          <div>
            <h2>Service change and maintenance</h2>
            <p>
              Features and guidance may evolve as the product improves. Maintenance, migration, and
              background processing should preserve business records, document history, and access
              expectations.
            </p>
          </div>
        </article>
      </section>
      <section className="tenant-page-section tenant-legal-note">
        <FileCheck2 />
        <div>
          <span>Need help with a specific workflow?</span>
          <h2>Use the product contact route for billing setup, support, and service questions.</h2>
        </div>
        <Link to="/contact">
          Contact options <ArrowRight />
        </Link>
      </section>
    </>
  );
}
