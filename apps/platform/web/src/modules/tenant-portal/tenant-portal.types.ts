export type TenantPortalTheme = "blue" | "emerald" | "slate" | "violet";

export type TenantPortalContent = {
  description: string;
  label: string;
  title: string;
};

export type TenantPortalPost = TenantPortalContent & {
  href: string;
};

export type TenantPublicPortal = {
  brandName: string;
  configured: boolean;
  domain: string;
  eyebrow: string;
  features: TenantPortalContent[];
  footerText: string;
  headline: string;
  loginPath: "/login";
  posts: TenantPortalPost[];
  publicSiteUrl: string | null;
  slides: TenantPortalContent[];
  summary: string;
  tenantCode: string | null;
  theme: TenantPortalTheme;
};
