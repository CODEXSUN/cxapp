import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteLogo } from "./tenant-site-logo";

export function TenantSiteFooter() {
  const { authenticated, portal } = useTenantSite();

  return (
    <footer className="tenant-portal-footer tenant-editorial-footer">
      <section className="tenant-footer-brief">
        <div>
          <span>CODEXSUN BUSINESS OPERATING PLATFORM</span>
          <h2>
            Run billing, accounts, records, communication, staff work, and automation in one
            connected platform.
          </h2>
        </div>
        <Link to="/features">
          Explore capabilities <ArrowRight />
        </Link>
      </section>
      <div className="tenant-footer-main">
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
            Features, automation, billing, accounts, communication, records, and daily operations in
            one connected business product.
          </p>
          <span className="tenant-footer-powered">
            Powered by <strong>AARAN SOFTWARE</strong>
          </span>
          {portal.domain ? <small>{portal.domain}</small> : null}
        </div>
        <div className="tenant-portal-footer-links">
          <section>
            <strong>Product</strong>
            <Link to="/workspace">Platform overview</Link>
            <Link to="/features">Capabilities</Link>
            <Link to="/security">Security</Link>
            <Link to="/updates">Product updates</Link>
            <a href={authenticated ? "/app/" : portal.loginPath}>
              {authenticated ? "Dashboard" : "Log in"}
            </a>
          </section>
          <section>
            <strong>Stories</strong>
            <Link to="/blog">Daily stories</Link>
            <Link to="/features">Technology</Link>
            <Link to="/updates">Automation</Link>
            <Link to="/workspace">Billing guide</Link>
          </section>
          <section>
            <strong>Company</strong>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/status">Platform status</Link>
            {portal.publicSiteUrl ? (
              <a href={portal.publicSiteUrl}>
                Public site <ExternalLink />
              </a>
            ) : null}
          </section>
        </div>
      </div>
      <div className="tenant-portal-footer-bottom">
        <span>Business operating platform</span>
        <span>
          © {new Date().getFullYear()} {portal.brandName} · AARAN SOFTWARE
        </span>
      </div>
    </footer>
  );
}
