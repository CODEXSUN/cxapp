import { ArrowRight, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

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
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
        eyebrow="Product direction"
        summary="We improve the common path first: faster entry, clearer checks, dependable handovers, and background work that reports its progress."
        title="Useful change, without unnecessary complexity."
        visual="updates"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="What guides each improvement"
          title="Make the product faster to learn and easier to trust."
        />
        <div className="tenant-simple-grid is-three">
          <article>
            <Gauge />
            <span>Speed</span>
            <h3>Remove repeated entry from common work.</h3>
            <p>Customer, product, tax, and document information should move forward naturally.</p>
          </article>
          <article>
            <ShieldCheck />
            <span>Accuracy</span>
            <h3>Keep checks close to the action.</h3>
            <p>Totals, status, responsibility, and exceptions should be easy to see.</p>
          </article>
          <article>
            <Sparkles />
            <span>Automation</span>
            <h3>Keep routine processing in the background.</h3>
            <p>Jobs and integrations should show progress without interrupting daily work.</p>
          </article>
        </div>
      </section>
      <section className="tenant-page-band is-amber">
        <div>
          <span>Current focus</span>
          <h2>Billing, collections, staff handovers, and reliable automation</h2>
        </div>
        <p>New capability must make the working day clearer.</p>
      </section>
      <TenantPortalCta />
    </>
  );
}
