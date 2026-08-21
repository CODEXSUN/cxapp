import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, ExternalLink, LogIn, MessageSquareText } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

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
        eyebrow="Start with the real workflow"
        summary="Tell us what your team creates, where work is repeated, and which checks must remain. That is enough to begin a useful product conversation."
        title="Bring the operating problem, not a feature checklist."
        visual="contact"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="Choose the right route"
          title="A clear next step for users, product questions, and service checks."
        />
        <div className="tenant-simple-grid is-three">
          <article>
            <LogIn />
            <span>Existing users</span>
            <h3>Continue the work already waiting for you.</h3>
            <p>Open billing, accounts, documents, and assigned follow-up.</p>
            <a href={portal.loginPath}>
              Sign in <ArrowRight />
            </a>
          </article>
          <article>
            <MessageSquareText />
            <span>Product discussion</span>
            <h3>Talk through the documents, people, and checks.</h3>
            <p>Show where the day slows down or depends on repeated entry.</p>
            {portal.publicSiteUrl ? (
              <a href={portal.publicSiteUrl}>
                Contact the team <ExternalLink />
              </a>
            ) : (
              <strong>Contact details will be published here.</strong>
            )}
          </article>
          <article>
            <Activity />
            <span>Service availability</span>
            <h3>Check the live platform status first.</h3>
            <p>Review current API and runtime availability before reporting an issue.</p>
            <Link to="/status">
              View status <ArrowRight />
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
