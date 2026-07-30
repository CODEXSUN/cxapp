import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  LockKeyhole,
  UsersRound
} from "lucide-react";
import { TenantFaq, type TenantFaqItem } from "../blocks/tenant-faq";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantProductPreview } from "../blocks/tenant-product-preview";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { billingSlides } from "../tenant-site.content";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

const workspaceFaq: TenantFaqItem[] = [
  {
    question: "Can a new staff member learn the billing flow quickly?",
    answer:
      "Yes. The experience keeps customer, item, tax, totals, document status, and next actions in a predictable order so new staff can become productive without memorising disconnected screens."
  },
  {
    question: "What happens when billing responsibility moves to another employee?",
    answer:
      "Access can be changed without deleting the business trail. Pending documents, customer context, status, and activity remain available to the authorised replacement."
  },
  {
    question: "How does the flow improve invoice accuracy?",
    answer:
      "Guided fields, reusable master data, tax and total checks, visible document status, and review steps help catch errors before a document moves forward."
  }
];

export function TenantWorkspacePage() {
  return (
    <TenantSiteTemplate activePage="workspace" pageTitle="Billing">
      <WorkspacePageContent />
    </TenantSiteTemplate>
  );
}

function WorkspacePageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow={`${portal.brandName} billing experience`}
        title="Billing work that new staff can understand from the first day."
        summary="Create invoices, continue into e-way bills and e-invoices, follow collections, and review daily work without teaching people a maze of screens."
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open billing <ArrowRight />
          </a>
        }
      />
      <section className="tenant-page-section tenant-workspace-section">
        <header className="tenant-page-section-heading">
          <span>How daily billing fits together</span>
          <h2>Enter the sale once. Carry accurate information through every next step.</h2>
        </header>
        <div className="tenant-workspace-steps">
          {billingSlides.map((slide, index) => (
            <article key={slide.title}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index === 0 ? <LockKeyhole /> : <CheckCircle2 />}
              </div>
              <small>{slide.label}</small>
              <h3>{slide.title}</h3>
              <p>{slide.description}</p>
            </article>
          ))}
        </div>
        <div className="tenant-context-panel">
          <div>
            <span>Billing flow</span>
            <strong>Quotation to receipt</strong>
          </div>
          <div>
            <span>Compliance documents</span>
            <strong>E-way bill and e-invoice</strong>
          </div>
          <div>
            <span>Staff experience</span>
            <strong>Guided and responsibility based</strong>
          </div>
        </div>
      </section>
      <section className="tenant-page-section tenant-workspace-product">
        <TenantSectionHeading
          eyebrow="See the billing model"
          title="A calm surface for daily work. A deeper system for accuracy underneath."
          summary="The product keeps routine invoicing easy while allowing stronger document checks, accounts visibility, staff controls, and automation when the business needs them."
        />
        <TenantProductPreview label="Billing work centre" />
      </section>
      <section className="tenant-page-section tenant-workspace-outcomes">
        <TenantSectionHeading
          eyebrow="Built for the working day"
          title="Less time correcting work. More confidence in every document and handover."
        />
        <div className="tenant-workspace-outcome-grid">
          <article>
            <Layers3 />
            <span>Connected billing</span>
            <h3>Sales, compliance, receipts, and accounts stay together</h3>
            <p>
              The team can move forward without copying the same customer and document information
              between disconnected tools.
            </p>
          </article>
          <article>
            <UsersRound />
            <span>Easy staff change</span>
            <h3>Responsibility can move without losing history</h3>
            <p>
              New staff can see the pending work, document status, and customer trail they inherit.
            </p>
          </article>
          <article>
            <ClipboardCheck />
            <span>Digital documentation</span>
            <h3>Documents and activity remain easy to find</h3>
            <p>
              Invoices, receipts, compliance references, attachments, and important changes stay
              connected to the work they explain.
            </p>
          </article>
        </div>
      </section>
      <TenantFaq items={workspaceFaq} />
      <TenantPortalCta />
    </>
  );
}
