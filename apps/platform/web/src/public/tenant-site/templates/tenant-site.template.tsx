import type { ReactNode } from "react";
import { TenantSiteFooter } from "../blocks/tenant-site-footer";
import { TenantSiteHeader } from "../blocks/tenant-site-header";
import { TenantSiteProvider, useTenantSite } from "../tenant-site.context";
import type { TenantPublicPageKey } from "../tenant-site.types";
import "../tenant-site.css";

export function TenantSiteTemplate({
  activePage,
  children,
  pageTitle
}: {
  activePage: TenantPublicPageKey;
  children: ReactNode;
  pageTitle?: string;
}) {
  return (
    <TenantSiteProvider pageTitle={pageTitle}>
      <TenantSiteFrame activePage={activePage}>{children}</TenantSiteFrame>
    </TenantSiteProvider>
  );
}

function TenantSiteFrame({
  activePage,
  children
}: {
  activePage: TenantPublicPageKey;
  children: ReactNode;
}) {
  const { loading, portal } = useTenantSite();

  return (
    <div
      className="tenant-portal"
      data-theme={portal.theme}
      aria-busy={loading ? "true" : undefined}
    >
      <TenantSiteHeader activePage={activePage} />
      <main className="tenant-portal-content">{children}</main>
      <TenantSiteFooter />
    </div>
  );
}
