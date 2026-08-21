import { ArrowRight, Blocks, Sparkles, UsersRound } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantAboutPage() {
  return (
    <TenantSiteTemplate activePage="about" pageTitle="About">
      <AboutPageContent />
    </TenantSiteTemplate>
  );
}

function AboutPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
        eyebrow={`About ${portal.brandName}`}
        summary={`${portal.brandName} brings website, billing, accounts, records, staff work, and practical automation into one secure workspace. Powered by AARAN SOFTWARE.`}
        title="Built around the work a growing business already does."
        visual="about"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="Our product belief"
          title="Software should carry complexity without passing it to every user."
        />
        <div className="tenant-simple-grid is-three">
          <article>
            <Sparkles />
            <span>Simple by default</span>
            <h3>Make the common path easy to learn.</h3>
            <p>Keep advanced detail available without crowding everyday work.</p>
          </article>
          <article>
            <Blocks />
            <span>Connected work</span>
            <h3>Keep the next action close to the first.</h3>
            <p>Documents, money movement, records, and follow-up stay connected.</p>
          </article>
          <article>
            <UsersRound />
            <span>Built to grow</span>
            <h3>Add capability without rebuilding the business day.</h3>
            <p>New staff, workflows, and automation can join a familiar product.</p>
          </article>
        </div>
      </section>
      <section className="tenant-page-band is-indigo">
        <div>
          <span>CODEXSUN</span>
          <h2>Business capability and automation, powered by AARAN SOFTWARE.</h2>
        </div>
        <p>One product. Clear ownership. Room to grow.</p>
      </section>
      <TenantPortalCta />
    </>
  );
}
