import { Activity, ArrowRight, ExternalLink, LogIn, MessageSquareText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TenantFaq, type TenantFaqItem } from "../blocks/tenant-faq";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

const contactFaq: TenantFaqItem[] = [
  {
    question: "Can we discuss our current invoice and accounts workflow?",
    answer:
      "Yes. Bring the steps your team follows today, the documents you create, the repeated work you want to remove, and the checks that must remain. That gives the product conversation a useful business starting point."
  },
  {
    question: "Can staff access and handover requirements be reviewed during setup?",
    answer:
      "Yes. List the responsibilities for billing, purchase, receipt, payment, reports, review, and administration, including what should happen when someone joins, leaves, or changes roles."
  },
  {
    question: "What should we share when reporting a billing issue?",
    answer:
      "Share the page, document type, time, visible status, expected result, and what happened instead. Do not send passwords, one-time codes, access tokens, or private credentials."
  }
];

export function TenantContactPage() {
  return (
    <TenantSiteTemplate activePage="contact" pageTitle="Contact">
      <ContactPageContent />
    </TenantSiteTemplate>
  );
}

function ContactPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Talk about better billing"
        title="Bring the billing problem. We will help frame the next-level workflow."
        summary={`Explore how ${portal.brandName} can improve invoicing, e-way bills, e-invoices, accounts visibility, staff control, digital records, and daily follow-up.`}
      />
      <section className="tenant-page-section tenant-contact-grid">
        <article>
          <LogIn />
          <span>Existing users</span>
          <h2>Open the application</h2>
          <p>Continue invoices, accounts work, document review, and pending follow-up.</p>
          <a href={portal.loginPath}>
            Sign in <ArrowRight />
          </a>
        </article>
        <article>
          <MessageSquareText />
          <span>Product conversation</span>
          <h2>Discuss your billing flow</h2>
          <p>
            Start with the documents, checks, staff responsibilities, and repeated work that shape
            your business day.
          </p>
          {portal.publicSiteUrl ? (
            <a href={portal.publicSiteUrl}>
              Contact the team <ExternalLink />
            </a>
          ) : (
            <strong>Contact route will be published here</strong>
          )}
        </article>
        <article>
          <Activity />
          <span>Service availability</span>
          <h2>Application status</h2>
          <p>Check current service availability before reporting an access or processing issue.</p>
          <Link to="/status">
            View application status <ArrowRight />
          </Link>
        </article>
      </section>
      <section className="tenant-page-section tenant-contact-prepare">
        <TenantSectionHeading
          eyebrow="Prepare for a useful conversation"
          title="Show the workflow, the people, and the accuracy you need."
          summary="The best product discussion starts with the real business day—not a list of disconnected feature names."
        />
        <div>
          <article>
            <span>01</span>
            <strong>Map the document journey</strong>
            <p>
              List quotation, invoice, e-way bill, e-invoice, receipt, payment, and report steps.
            </p>
          </article>
          <article>
            <span>02</span>
            <strong>Name the difficult hand-offs</strong>
            <p>Explain where staff wait, re-enter data, miss context, or depend on one person.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Define the checks that matter</strong>
            <p>Include tax, totals, approval, due dates, document status, and accounts review.</p>
          </article>
        </div>
      </section>
      <TenantFaq items={contactFaq} title="Billing setup and support questions" />
    </>
  );
}
