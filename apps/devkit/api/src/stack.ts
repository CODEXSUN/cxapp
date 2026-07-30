export const DEVKIT_PACKAGE_VERSION = "1.0.43";

export const devkitStackContribution = Object.freeze({
  applicationMode: "client" as const,
  capabilities: Object.freeze({
    api: true,
    database: true,
    web: true
  }),
  compatibility: Object.freeze({
    cxapp: "^1.0.2"
  }),
  contractVersion: 1,
  dependencies: Object.freeze([] as string[]),
  description: "Platform application and module registry.",
  displayName: "CODEXSUN DevKit",
  id: "devkit",
  packageId: "@cxapp/devkit-api",
  registrationOrder: Object.freeze(["database", "api", "web"] as const),
  requiredEnvironment: Object.freeze([] as string[]),
  version: DEVKIT_PACKAGE_VERSION
});
