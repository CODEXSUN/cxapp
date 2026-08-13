import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, LogOut } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import type { TenantPublicPageKey } from "../tenant-site.types";
import { TenantSiteLogo } from "./tenant-site-logo";

export function TenantSiteHeader({ activePage }: { activePage: TenantPublicPageKey }) {
  const { authenticated, portal, signOut } = useTenantSite();

  return (
    <nav className="tenant-portal-nav" aria-label="Billing product navigation">
      <Link className="tenant-portal-brand" to="/" aria-label={`${portal.brandName} home`}>
        <TenantSiteLogo
          brandName={portal.brandName}
          className="tenant-portal-mark"
          logoDarkUrl={portal.logoDarkUrl}
          logoUrl={portal.logoUrl}
        />
        <span>
          <strong>{portal.brandName}</strong>
          <small>Billing &amp; Accounts</small>
        </span>
      </Link>
      <div className="tenant-portal-menu">
        <Link to="/workspace" aria-current={activePage === "workspace" ? "page" : undefined}>
          Billing
        </Link>
        <Link to="/features" aria-current={activePage === "features" ? "page" : undefined}>
          Features
        </Link>
        <Link to="/security" aria-current={activePage === "security" ? "page" : undefined}>
          Security
        </Link>
        <Link to="/blog" aria-current={activePage === "blog" ? "page" : undefined}>
          Blog
        </Link>
        <Link to="/updates" aria-current={activePage === "updates" ? "page" : undefined}>
          Updates
        </Link>
        {portal.publicSiteUrl ? (
          <a href={portal.publicSiteUrl}>
            Public site <ExternalLink />
          </a>
        ) : null}
      </div>
      <div className="tenant-portal-session-actions">
        {authenticated ? (
          <>
            <a className="tenant-portal-login" href="/app/">
              Dashboard <ArrowRight />
            </a>
            <button className="tenant-portal-logout" type="button" onClick={() => void signOut()}>
              Log out <LogOut />
            </button>
          </>
        ) : (
          <a className="tenant-portal-login" href={portal.loginPath}>
            Log in <ArrowRight />
          </a>
        )}
      </div>
    </nav>
  );
}
