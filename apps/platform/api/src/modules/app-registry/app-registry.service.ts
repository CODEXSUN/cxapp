import type {
  PlatformAppDefinition,
  PlatformAppId,
  PlatformAppSavePayload
} from "./app-registry.types.js";
import { AppRegistryRepository } from "./app-registry.repository.js";

export const defaultTenantModuleKeys = [
  "platform.application",
  "billing.sales",
  "accounts.overview",
  "mail",
  "platform.task-manager",
  "auditor"
] as const;

export const platformAppRegistry: PlatformAppDefinition[] = [
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Platform application and module registry.",
    appId: "devkit",
    id: 0,
    label: "DevKit",
    moduleKey: "devkit",
    stack: "devkit",
    uuid: ""
  },
  {
    alwaysEnabled: true,
    defaultLanding: true,
    description: "Platform workspace, tenant profile, application settings, users, and access.",
    appId: "application",
    id: 0,
    label: "Application",
    moduleKey: "platform.application",
    stack: "platform",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Billing sales, core masters, invoice flow, and billing setup.",
    appId: "billing",
    id: 0,
    label: "Billing",
    moduleKey: "billing.sales",
    stack: "billing",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description:
      "Tenant inbox, compose, queued SMTP delivery, sent history, failures, and settings.",
    appId: "mail",
    id: 0,
    label: "Mail",
    moduleKey: "mail",
    stack: "mail",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Chart of accounts, ledger groups, ledgers, journal, and accounting overview.",
    appId: "accounts",
    id: 0,
    label: "Accounts",
    moduleKey: "accounts.overview",
    stack: "accounts",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Tenant-owned Todo planning backed by the live tenant database.",
    appId: "task-manager",
    id: 0,
    label: "Task Manager",
    moduleKey: "platform.task-manager",
    stack: "platform-task-manager",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Tenant-owned articles, authors, media, SEO, discussions, and publishing.",
    appId: "blog",
    id: 0,
    label: "Blog",
    moduleKey: "blog",
    stack: "blog",
    uuid: ""
  },
  {
    alwaysEnabled: false,
    defaultLanding: false,
    description: "Tenant audit planning, evidence, findings, compliance review, and sign-off.",
    appId: "auditor",
    id: 0,
    label: "Auditor",
    moduleKey: "auditor",
    stack: "auditor",
    uuid: ""
  }
];

export function resolveEnabledApps(enabledModuleKeys: string[]) {
  const enabled = new Set(["platform.application", ...enabledModuleKeys]);
  return platformAppRegistry
    .filter((app) => app.appId !== "devkit")
    .map((app) => ({
      ...app,
      enabled: app.alwaysEnabled || enabled.has(app.moduleKey)
    }));
}

export function resolveLandingApp(value: unknown, enabledModuleKeys: string[]): PlatformAppId {
  const enabledApps = resolveEnabledApps(enabledModuleKeys).filter((app) => app.enabled);
  const requested = typeof value === "string" ? value : "";
  if (enabledApps.some((app) => app.appId === requested)) {
    return requested as PlatformAppId;
  }
  return "application";
}

export class AppRegistryService {
  constructor(private readonly repository = new AppRegistryRepository()) {}
  listApps() {
    return this.repository.list();
  }
  createApp(input: PlatformAppSavePayload) {
    validateApp(input);
    return this.repository.create(input);
  }
  updateApp(id: string, input: PlatformAppSavePayload) {
    validateApp(input);
    return this.repository.update(Number(id), input);
  }
}

function validateApp(input: PlatformAppSavePayload) {
  if (!input.label.trim() || !input.moduleKey.trim())
    throw new Error("App label and module key are required.");
}
