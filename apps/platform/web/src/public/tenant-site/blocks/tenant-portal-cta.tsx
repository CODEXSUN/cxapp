import { ArrowRight, ExternalLink } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";

export function TenantPortalCta({
  summary = "Open the application to create documents, follow accounts, review staff work, and continue the next billing action.",
  title = "Ready to make daily billing easier?"
}: {
  summary?: string;
  title?: string;
}) {
  const { portal } = useTenantSite();

  return (
    <section className="tenant-portal-cta">
      <div>
        <span>Continue with {portal.brandName}</span>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className="tenant-portal-actions">
        <a className="tenant-portal-primary" href={portal.loginPath}>
          Open application <ArrowRight />
        </a>
        {portal.publicSiteUrl ? (
          <a className="tenant-portal-secondary" href={portal.publicSiteUrl}>
            Public site <ExternalLink />
          </a>
        ) : null}
      </div>
    </section>
  );
}
