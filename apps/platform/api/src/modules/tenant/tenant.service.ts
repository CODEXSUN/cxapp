import { TenantRepository } from "./tenant.repository.js";
import type {
  Tenant,
  TenantPortalContent,
  TenantPortalPost,
  TenantPortalTheme,
  TenantPublicPortal,
  TenantSavePayload
} from "./tenant.types.js";
import {
  defaultTenantModuleKeys,
  resolveEnabledApps,
  resolveLandingApp
} from "../app-registry/index.js";
import { EntitlementAccessService } from "../entitlement/entitlement.access.js";
import { env } from "../../env.js";
import {
  defaultTenantDomainForSlug,
  normalizeTenantDomain
} from "../tenant-domain/tenant-domain.repository.js";
import {
  getApplicationCompanyBrandingForDatabase,
  getDefaultCompanyForDatabase,
  type ApplicationCompanyBranding
} from "@cxapp/core-api";
import { AppError, isAppError } from "@cxapp/framework/errors";

export class TenantService {
  constructor(
    private readonly repository = new TenantRepository(),
    private readonly access = new EntitlementAccessService()
  ) {}

  async listTenants() {
    const tenants = await this.repository.list();
    return Promise.all(tenants.map((tenant) => this.withDefaultCompanyLandingApp(tenant)));
  }

  getTenant(value: string) {
    return this.repository.findByIdOrCode(value);
  }

  async getTenantRuntime(value: string) {
    const tenant = await this.getTenant(value);
    const accessTenant = tenant ? await this.access.refreshTenantAccess(tenant.id) : null;
    const runtimeTenant = accessTenant ?? tenant;
    const enabledModuleKeys = runtimeTenant?.enabledModuleKeys ?? ["platform.application"];
    const defaultCompany = runtimeTenant
      ? await getDefaultCompanyForDatabase(runtimeTenant.dbName)
      : null;
    const defaultLandingApp = resolveLandingApp(defaultCompany?.landingApp, enabledModuleKeys);
    return {
      apps: resolveEnabledApps(enabledModuleKeys),
      defaultLandingApp,
      tenant: runtimeTenant ?? null
    };
  }

  async getPublicPortal(value: string): Promise<TenantPublicPortal> {
    const { company, domain, tenant } = await this.getPublicApplicationCompany(value);
    return publicPortalForTenant(tenant, domain, company);
  }

  async getPublicApplicationCompany(value: string) {
    const domain = normalizeTenantDomain(value);
    let tenant = domain ? await this.repository.findByDomain(domain) : null;
    const canonicalDomain = normalizeTenantDomain(env.PLATFORM_WEB_ORIGIN);

    if (!tenant && domain && domain === canonicalDomain && env.DEFAULT_TENANT_CORPORATE_ID) {
      tenant = await this.repository.findByCorporateId(env.DEFAULT_TENANT_CORPORATE_ID);
    }

    const company = tenant
      ? await getApplicationCompanyBrandingForDatabase(tenant.dbName).catch(() => null)
      : null;
    return { company, domain, tenant };
  }

  async createTenant(input: TenantSavePayload) {
    try {
      return await this.repository.create(this.normalize(input, true));
    } catch (error) {
      throw tenantPersistenceError(error);
    }
  }

  async updateTenant(id: string, input: TenantSavePayload) {
    try {
      return await this.repository.update(id, this.normalize(input));
    } catch (error) {
      throw tenantPersistenceError(error);
    }
  }

  suspendTenant(id: string) {
    return this.repository.setStatus(id, "suspended");
  }

  restoreTenant(id: string) {
    return this.repository.setStatus(id, "active");
  }

  listActivity(id: string) {
    return this.repository.activity(id);
  }

  private normalize(input: TenantSavePayload, includeDefaults = false): TenantSavePayload {
    const tenantCode = input.tenantCode.trim().toUpperCase();
    const slug = input.slug.trim().toLowerCase() || tenantCode.toLowerCase();
    const incomingPayloadSettings = isRecord(input.payloadSettings) ? input.payloadSettings : {};
    const incomingLanding = isRecord(incomingPayloadSettings.landing)
      ? incomingPayloadSettings.landing
      : {};
    const incomingApps = isRecord(incomingPayloadSettings.apps) ? incomingPayloadSettings.apps : {};
    const disabledModuleKeys = parseStringArray(incomingApps.disabled).filter(
      (key) => key !== "platform.application"
    );
    const legacyKeys = input.enabledModuleKeys
      .map((key) => (key === "platform.tenant" ? "platform.application" : key))
      .filter((key) => key !== "devkit");
    const defaultKeys = includeDefaults
      ? defaultTenantModuleKeys.filter((key) => !disabledModuleKeys.includes(key))
      : ["platform.application"];
    const enabledModuleKeys = Array.from(new Set([...defaultKeys, ...legacyKeys]));
    const defaultLandingApp = resolveLandingApp(input.defaultLandingApp, enabledModuleKeys);
    return {
      ...input,
      corporateId: input.corporateId?.trim().toUpperCase() || tenantCode,
      dbHost: input.dbHost.trim() || "127.0.0.1",
      dbName: input.dbName.trim() || `${slug}_db`,
      dbPort: Number(input.dbPort) || 3306,
      dbSecretRef: input.dbSecretRef.trim() || "DB_PASSWORD",
      dbType: input.dbType.trim() || env.DB_DRIVER,
      dbUser: input.dbUser.trim() || env.DB_USER,
      defaultLandingApp,
      enabledModuleKeys,
      mobile: input.mobile?.trim() || null,
      payloadSettings: {
        ...incomingPayloadSettings,
        apps: {
          ...incomingApps,
          disabled: disabledModuleKeys,
          enabled: enabledModuleKeys
        },
        landing: {
          ...incomingLanding,
          app: defaultLandingApp,
          mode: "tenant"
        }
      },
      primaryDomain: normalizeTenantDomain(input.primaryDomain || defaultTenantDomainForSlug(slug)),
      slug,
      status: input.status,
      tenantCode,
      tenantName: input.tenantName.trim()
    };
  }

  private async withDefaultCompanyLandingApp(tenant: Tenant): Promise<Tenant> {
    const defaultCompany = await getDefaultCompanyForDatabase(tenant.dbName).catch(() => null);
    return {
      ...tenant,
      defaultLandingApp: resolveLandingApp(defaultCompany?.landingApp, tenant.enabledModuleKeys)
    };
  }
}

const portalThemes = new Set<TenantPortalTheme>(["blue", "emerald", "slate", "violet"]);

export function publicPortalForTenant(
  tenant: Tenant | null,
  domain: string,
  company: ApplicationCompanyBranding | null = null
): TenantPublicPortal {
  const settings =
    tenant && isRecord(tenant.payloadSettings.appPortal) ? tenant.payloadSettings.appPortal : {};
  const configuredBrandName = portalText(
    settings.brandName,
    tenant?.tenantName ?? "Your workspace",
    80
  );
  const brandName = portalText(company?.brandName, configuredBrandName, 80);
  const publicSiteUrl = safePublicUrl(settings.publicSiteUrl);
  const theme = portalThemes.has(settings.theme as TenantPortalTheme)
    ? (settings.theme as TenantPortalTheme)
    : "blue";
  const fallbackSlides: TenantPortalContent[] = [
    {
      description:
        "Move from sign-in to the work that matters without searching across disconnected tools.",
      label: "Workspace",
      title: "A clearer start to every workday"
    },
    {
      description:
        "Your enabled applications, people, and operating context stay connected behind one secure entry point.",
      label: "Access",
      title: "One place for every active app"
    },
    {
      description:
        "Add capabilities as the business grows while the workspace remains familiar to the people using it.",
      label: "Scale",
      title: "Built around the way your team evolves"
    }
  ];
  const fallbackFeatures: TenantPortalContent[] = [
    {
      description: "Open the applications assigned to your tenant from one governed workspace.",
      label: "01",
      title: "Connected applications"
    },
    {
      description:
        "Tenant identity and permissions keep each person inside the right operating context.",
      label: "02",
      title: "Secure by context"
    },
    {
      description:
        "Work, records, and activity stay readable as more teams and workflows come online.",
      label: "03",
      title: "Operational clarity"
    }
  ];
  const fallbackPosts: TenantPortalPost[] = [
    {
      description:
        "A quick orientation for entering your workspace and finding enabled applications.",
      href: "/login",
      label: "Getting started",
      title: "Your workspace entry guide"
    },
    {
      description: "Why tenant-aware access keeps business work focused, private, and accountable.",
      href: "/login",
      label: "Workspace note",
      title: "Access that follows business context"
    },
    {
      description:
        "Sign in to see the applications and current updates available to your organisation.",
      href: "/login",
      label: "Inside the app",
      title: "What is ready for your team"
    }
  ];

  return {
    brandName,
    blogMediaPath: typeof settings.blogMediaPath === "string" && settings.blogMediaPath.trim()
      ? settings.blogMediaPath.trim().replace(/\/$/u, "")
      : null,
    configured: Boolean(tenant),
    domain,
    eyebrow: portalText(settings.eyebrow, "Business workspace", 80),
    features: portalContentList(settings.features, fallbackFeatures),
    footerText: portalText(
      settings.footerText,
      `${brandName} brings your enabled business applications into one secure workspace.`,
      220
    ),
    headline: portalText(settings.headline, "One workspace. Clear work. Every day.", 140),
    loginPath: "/login",
    logoDarkUrl: company?.logoDarkPath
      ? publicCompanyLogoUrl("logo-dark", company.updatedAt)
      : null,
    logoUrl: company?.logoPath ? publicCompanyLogoUrl("logo", company.updatedAt) : null,
    posts: portalPostList(settings.posts, fallbackPosts),
    publicSiteUrl,
    slides: portalContentList(settings.slides, fallbackSlides),
    summary: portalText(
      settings.summary,
      "Enter a focused operating space for your applications, people, and daily business activity.",
      260
    ),
    tenantCode: tenant?.tenantCode ?? null,
    theme
  };
}

function publicCompanyLogoUrl(variant: "logo" | "logo-dark", updatedAt: string) {
  return `/public/app-portal/company-logo/${variant}?v=${encodeURIComponent(updatedAt)}`;
}

function portalContentList(value: unknown, fallback: TenantPortalContent[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const title = portalText(entry.title, "", 100);
    const description = portalText(entry.description, "", 220);
    if (!title || !description) return [];
    return [{ description, label: portalText(entry.label, "Workspace", 40), title }];
  });
  return items.length ? items.slice(0, 6) : fallback;
}

function portalPostList(value: unknown, fallback: TenantPortalPost[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const title = portalText(entry.title, "", 100);
    const description = portalText(entry.description, "", 220);
    if (!title || !description) return [];
    const href = safePortalHref(entry.href);
    return [{ description, href, label: portalText(entry.label, "Update", 40), title }];
  });
  return items.length ? items.slice(0, 6) : fallback;
}

function portalText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function safePublicUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString().replace(/\/$/, "")
      : null;
  } catch {
    return null;
  }
}

function safePortalHref(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "/login";
  if (/^\/(?!\/)/u.test(value) && !value.includes("\\")) return value;
  return safePublicUrl(value) ?? "/login";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function tenantPersistenceError(error: unknown) {
  if (isAppError(error)) return error;
  const message = error instanceof Error && error.message ? error.message : String(error);
  return AppError.internal(message || "Tenant could not be saved.");
}
