import { ArrowRight, CheckCircle2, CircleDot, FileClock, Gauge, ShieldCheck } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

const productDirections = [
  {
    description:
      "Reduce unnecessary movement between customer, item, tax, totals, payment, print, and sharing steps while preserving a final review point.",
    href: "/features",
    label: "Invoice experience",
    title: "Faster entry with clearer checks"
  },
  {
    description:
      "Make e-way bill and e-invoice preparation easier to follow with reusable billing details, visible exceptions, and readable document status.",
    href: "/features",
    label: "Compliance documents",
    title: "Less re-entry, better visibility"
  },
  {
    description:
      "Keep pending work, responsibility, recent activity, and document context understandable when employees join, leave, or change roles.",
    href: "/security",
    label: "Staff experience",
    title: "Smoother onboarding and handover"
  },
  {
    description:
      "Bring receivables, promised payments, overdue documents, reminders, and next actions closer to the everyday billing view.",
    href: "/workspace",
    label: "Accounts visibility",
    title: "Follow up while the information is current"
  }
] as const;

export function TenantUpdatesPage() {
  return (
    <TenantSiteTemplate activePage="updates" pageTitle="Updates">
      <UpdatesPageContent />
    </TenantSiteTemplate>
  );
}

function UpdatesPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Product direction"
        title="Every improvement should make billing faster to learn, easier to check, and clearer to monitor."
        summary={`${portal.brandName} continues to refine the complete billing experience—from invoice entry and compliance documents to staff handovers, accounts follow-up, and dependable background work.`}
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
      />
      <section className="tenant-page-section tenant-update-layout">
        <div className="tenant-update-feed">
          {productDirections.map((item, index) => (
            <a href={item.href} key={item.title}>
              <span className="tenant-update-marker">
                {index === 0 ? <CircleDot /> : <CheckCircle2 />}
              </span>
              <div>
                <small>{item.label}</small>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <strong>
                  Explore this area <ArrowRight />
                </strong>
              </div>
            </a>
          ))}
        </div>
        <aside className="tenant-update-summary">
          <span>Product focus</span>
          <h2>{portal.brandName}</h2>
          <dl>
            <div>
              <dt>Speed</dt>
              <dd>Fewer repeated steps</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>Checks before action</dd>
            </div>
            <div>
              <dt>Adoption</dt>
              <dd>Clear for new staff</dd>
            </div>
          </dl>
        </aside>
      </section>
      <section className="tenant-page-section tenant-release-principles">
        <TenantSectionHeading
          eyebrow="How improvement should feel"
          title="More capability without making familiar billing work feel unfamiliar."
          summary="New checks, automation, and monitoring should appear where they help the work—not as extra complexity people must navigate every day."
        />
        <div>
          <article>
            <Gauge />
            <span>Focused refinement</span>
            <h3>Make the common path faster first</h3>
            <p>
              Improve high-frequency invoice and accounts actions before adding depth around rare
              exceptions.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <span>Safe change</span>
            <h3>Keep totals, status, and responsibility visible</h3>
            <p>
              Workflow changes should preserve the financial checks and activity context teams
              depend on.
            </p>
          </article>
          <article>
            <FileClock />
            <span>Dependable operations</span>
            <h3>Let background work stay in the background</h3>
            <p>
              Exports, integrations, document processing, and maintenance should report progress
              clearly without interrupting routine billing.
            </p>
          </article>
        </div>
      </section>
      <TenantPortalCta />
    </>
  );
}
