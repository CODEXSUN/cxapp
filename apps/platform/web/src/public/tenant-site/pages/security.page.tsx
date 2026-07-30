import { ArrowRight, BadgeCheck, ClipboardCheck, Eye, LockKeyhole } from "lucide-react";
import { TenantFaq, type TenantFaqItem } from "../blocks/tenant-faq";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { TenantSecuritySection } from "../sections/security.section";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

const securityFaq: TenantFaqItem[] = [
  {
    question: "Can billing access be limited by staff responsibility?",
    answer:
      "Yes. Sales, purchase, receipt, payment, reporting, approval, and administration actions can be shaped around the responsibilities assigned to each account."
  },
  {
    question: "What happens when an employee leaves or changes roles?",
    answer:
      "Their access can be changed while the company keeps its customer records, documents, pending work, status, and activity trail. A replacement can continue from the authorised business context instead of starting from memory."
  },
  {
    question: "Can important document changes be reviewed later?",
    answer:
      "Financial and compliance workflows are designed to keep important lifecycle actions traceable. The exact activity available depends on the document and the access granted to the signed-in user."
  },
  {
    question: "How are invoice mistakes reduced?",
    answer:
      "Reusable master data, visible totals, required-field validation, status, and review steps help the team catch incomplete or inconsistent details before final actions."
  }
];

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
        eyebrow="Billing control"
        title="Protect billing work without making staff work harder."
        summary={`${portal.brandName} keeps sign-in, staff responsibility, document validation, status, and activity around the work so financial control feels practical every day.`}
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open secure billing <ArrowRight />
          </a>
        }
      />
      <TenantSecuritySection />
      <section className="tenant-page-section tenant-assurance-section">
        <TenantSectionHeading
          eyebrow="Practical financial controls"
          title="Prevent avoidable mistakes, keep responsibility visible, and make handovers easier to trust."
          summary="Control is most useful when it appears inside the billing step: before a wrong total, an incomplete document, or an unauthorised action moves forward."
        />
        <div className="tenant-assurance-grid">
          <article>
            <LockKeyhole />
            <span>Account access</span>
            <h3>Business records begin behind sign-in</h3>
            <p>
              Public product information stays separate from customer, invoice, payment, ledger,
              report, and staff activity data.
            </p>
          </article>
          <article>
            <Eye />
            <span>Staff visibility</span>
            <h3>People see the areas needed for their work</h3>
            <p>
              Sales staff can focus on billing, accounts staff can focus on money movement, and
              reviewers can focus on checks and approvals.
            </p>
          </article>
          <article>
            <ClipboardCheck />
            <span>Document accuracy</span>
            <h3>Validation appears before important actions</h3>
            <p>
              Missing fields, inconsistent values, status, and required review remain visible before
              a document continues to the next stage.
            </p>
          </article>
          <article>
            <BadgeCheck />
            <span>Accountability</span>
            <h3>Critical activity is easier to explain later</h3>
            <p>
              Important creation, change, approval, cancellation, and lifecycle actions are designed
              to remain traceable for operational review.
            </p>
          </article>
        </div>
      </section>
      <TenantFaq items={securityFaq} title="Clear answers about billing control and staff access" />
      <TenantPortalCta
        title="Give the team a faster billing flow without giving up control."
        summary="Continue through sign-in to work with the documents and actions assigned to your account."
      />
    </>
  );
}
