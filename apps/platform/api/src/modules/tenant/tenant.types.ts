export type TenantStatus = "active" | "inactive" | "provisioning" | "suspended";

export type Tenant = {
  corporateId: string | null;
  dbHost: string;
  dbName: string;
  dbPort: number;
  dbSecretRef: string;
  dbType: string;
  dbUser: string;
  enabledModuleKeys: string[];
  defaultLandingApp: "application" | "billing" | "mail" | "task-manager";
  id: number;
  mobile: string | null;
  payloadSettings: Record<string, unknown>;
  primaryDomain: string;
  slug: string;
  status: TenantStatus;
  storagePrivateRoot: string;
  storagePublicRoot: string;
  storageRoot: string;
  tenantCode: string;
  tenantName: string;
  uuid: string;
};

export type TenantSavePayload = Omit<
  Tenant,
  "id" | "primaryDomain" | "storagePrivateRoot" | "storagePublicRoot" | "storageRoot" | "uuid"
> & {
  primaryDomain?: string;
  storagePrivateRoot?: string;
  storagePublicRoot?: string;
  storageRoot?: string;
  uuid?: string;
};

export type TenantAuditEvent = {
  actor_email: string;
  created_at: string;
  event_name: string;
  id: string;
};

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
