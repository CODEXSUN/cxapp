import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteLogo } from "./tenant-site-logo";

export function TenantSiteFooter() {
  const { authenticated, portal } = useTenantSite();

  return (
    <footer className="tenant-portal-footer">
      <div className="tenant-portal-footer-brand">
        <div>
          <TenantSiteLogo
            brandName={portal.brandName}
            className="tenant-portal-mark"
            logoDarkUrl={portal.logoDarkUrl}
            logoUrl={portal.logoUrl}
          />
          <strong>{portal.brandName}</strong>
        </div>
        <p>
          Billing, accounts, compliance documents, staff controls, and daily follow-up in one clear
          business flow.
        </p>
        {portal.domain ? <small>{portal.domain}</small> : null}
      </div>
      <div className="tenant-portal-footer-links">
        <section>
          <strong>Product</strong>
          <Link to="/workspace">Billing overview</Link>
          <Link to="/features">Features</Link>
          <Link to="/security">Security</Link>
          <Link to="/updates">Updates</Link>
          <a href={authenticated ? "/app/" : portal.loginPath}>
            {authenticated ? "Dashboard" : "Log in"}
          </a>
        </section>
        <section>
          <strong>Company</strong>
          <Link to="/about">About</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
          {portal.publicSiteUrl ? (
            <a href={portal.publicSiteUrl}>
              Public site <ExternalLink />
            </a>
          ) : null}
        </section>
        <section>
          <strong>Application</strong>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/status">Platform status</Link>
        </section>
      </div>
      <div className="tenant-portal-footer-bottom">
        <span>Billing and accounts application</span>
        <span>
          © {new Date().getFullYear()} {portal.brandName}
        </span>
      </div>
    </footer>
  );
}
