import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const requestedApp = process.argv[2]?.trim();

const moduleRoots = [
  {
    app: "mail-api",
    path: join(process.cwd(), "apps", "mail", "api", "src", "modules")
  },
  {
    app: "billing-api",
    path: join(process.cwd(), "apps", "billing", "api", "src", "modules")
  },
  {
    app: "core-api",
    path: join(process.cwd(), "apps", "core", "api", "src", "modules")
  },
  {
    app: "platform-api",
    path: join(process.cwd(), "apps", "platform", "api", "src", "modules")
  }
];

const requiredBackendRoles = [
  "module",
  "service",
  "repository",
  "routes",
  "events",
  "migration",
  "worker",
  "seed",
  "sync",
  "types"
];
const reducedPlatformBackendModules = new Set([
  "tenant-user",
  "tenant-role",
  "tenant-permission",
  "tenant-user-role",
  "tenant-role-permission"
]);
const reducedBackendRoles = [
  "module",
  "service",
  "repository",
  "routes",
  "migration",
  "seed",
  "types"
];
const shellOnlyBackendModules = new Set();
const shellOnlyBackendRoles = ["module", "routes", "types"];
const capabilityBackendRoles = new Map();

const webModuleRoots = [
  {
    app: "mail-web",
    path: join(process.cwd(), "apps", "mail", "web", "src", "modules")
  },
  {
    app: "billing-web",
    path: join(process.cwd(), "apps", "billing", "web", "src", "modules")
  },
  {
    app: "core-web",
    path: join(process.cwd(), "apps", "core", "web", "src", "modules")
  },
  {
    app: "platform-web",
    path: join(process.cwd(), "apps", "platform", "web", "src", "modules")
  }
];

const requiredFrontendRoles = ["workspace", "list", "form", "services", "hooks", "types", "schema"];
const shellOnlyFrontendModules = new Set();
const shellOnlyFrontendRoles = ["module", "workspace", "services", "hooks", "types"];
const capabilityFrontendRoles = new Map();
const backendBehaviorMarkers = {
  events: ["create"],
  migration: ["migrate"],
  module: ["register"],
  seed: ["seed"],
  sync: ["function"],
  worker: ["process"]
};
const forbiddenScaffoldPatterns = [
  /reserved\s+(worker|sync|seed|migration)\s+surface/i,
  /queues\s*:\s*\[\s*\]/,
  /export\s*\{\s*\w+\s+as\s+\w+\s*\}\s*from/
];

const missing = [];

for (const root of moduleRoots) {
  if (requestedApp && root.app !== `${requestedApp}-api`) continue;
  if (!existsSync(root.path)) {
    missing.push(`${root.app}: missing src/modules`);
    continue;
  }

  if (root.app === "core-api") {
    validateCoreBackend(root);
    continue;
  }
  const modules = readdirSync(root.path, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );
  for (const moduleDir of modules) {
    const modulePath = join(root.path, moduleDir.name);
    if (root.app === "billing-api" && moduleDir.name === "reports") {
      validateBillingReportBackend(modulePath);
      continue;
    }
    const moduleLabel = `${root.app}/${moduleDir.name}`;
    const moduleRoles =
      capabilityBackendRoles.get(moduleLabel) ??
      (shellOnlyBackendModules.has(moduleLabel)
        ? shellOnlyBackendRoles
        : root.app === "platform-api" && reducedPlatformBackendModules.has(moduleDir.name)
          ? reducedBackendRoles
          : requiredBackendRoles);
    for (const role of moduleRoles) {
      const filePath = join(modulePath, `${moduleDir.name}.${role}.ts`);
      if (!existsSync(filePath)) {
        missing.push(`${root.app}/${moduleDir.name}: missing ${moduleDir.name}.${role}.ts`);
        continue;
      }
      validateRoleFile(filePath, `${root.app}/${moduleDir.name}`, role);
    }
    if (!existsSync(join(modulePath, "index.ts"))) {
      missing.push(`${root.app}/${moduleDir.name}: missing index.ts`);
    }
  }
}

for (const root of webModuleRoots) {
  if (requestedApp && root.app !== `${requestedApp}-web`) continue;
  if (!existsSync(root.path)) continue;
  if (root.app === "core-web") {
    validateCoreFrontend(root);
    continue;
  }
  const modules = readdirSync(root.path, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );
  for (const moduleDir of modules) {
    const modulePath = join(root.path, moduleDir.name);
    if (root.app === "billing-web" && moduleDir.name === "reports") {
      validateBillingReportFrontend(modulePath);
      continue;
    }
    const moduleLabel = `${root.app}/${moduleDir.name}`;
    const moduleRoles =
      capabilityFrontendRoles.get(moduleLabel) ??
      (shellOnlyFrontendModules.has(moduleLabel) ? shellOnlyFrontendRoles : requiredFrontendRoles);
    if (
      !shellOnlyFrontendModules.has(moduleLabel) &&
      !existsSync(join(modulePath, `${moduleDir.name}.services.ts`))
    )
      continue;

    for (const role of moduleRoles) {
      const extension = ["form", "list", "workspace"].includes(role) ? "tsx" : "ts";
      const filePath = join(modulePath, `${moduleDir.name}.${role}.${extension}`);
      if (!existsSync(filePath)) {
        missing.push(
          `${root.app}/${moduleDir.name}: missing ${moduleDir.name}.${role}.${extension}`
        );
        continue;
      }
      validateRoleFile(filePath, `${root.app}/${moduleDir.name}`, role);
    }
    if (!existsSync(join(modulePath, "index.ts"))) {
      missing.push(`${root.app}/${moduleDir.name}: missing index.ts`);
    }
  }
}

if (missing.length > 0) {
  console.error("Module boundary check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Module boundary check passed.");

function validateCoreBackend(root) {
  const leafRoles = ["migration", "module", "repository", "routes", "seed", "service", "types"];
  for (const modulePath of leafDirectories(root.path)) {
    const moduleName = modulePath.split(/[\\/]/).at(-1);
    const label = `${root.app}/${relativeModule(root.path, modulePath)}`;
    for (const role of leafRoles) {
      const filePath = join(modulePath, `${moduleName}.${role}.ts`);
      if (!existsSync(filePath)) missing.push(`${label}: missing ${moduleName}.${role}.ts`);
      else validateRoleFile(filePath, label, role);
    }
    if (!existsSync(join(modulePath, "index.ts"))) missing.push(`${label}: missing index.ts`);
  }
  for (const name of ["common", "master", "organisation"]) {
    const path = join(root.path, name);
    for (const role of ["module", "migration", "seed"]) {
      if (!existsSync(join(path, `${name}.${role}.ts`)))
        missing.push(`${root.app}/${name}: missing composition ${name}.${role}.ts`);
    }
    if (!existsSync(join(path, "index.ts"))) missing.push(`${root.app}/${name}: missing index.ts`);
  }
}

function validateCoreFrontend(root) {
  for (const modulePath of leafDirectories(root.path)) {
    const moduleName = modulePath.split(/[\\/]/).at(-1);
    const label = `${root.app}/${relativeModule(root.path, modulePath)}`;
    for (const role of requiredFrontendRoles) {
      const extension = ["form", "list", "workspace"].includes(role) ? "tsx" : "ts";
      const filePath = join(modulePath, `${moduleName}.${role}.${extension}`);
      if (!existsSync(filePath))
        missing.push(`${label}: missing ${moduleName}.${role}.${extension}`);
      else validateRoleFile(filePath, label, role);
    }
    if (!existsSync(join(modulePath, "index.ts"))) missing.push(`${label}: missing index.ts`);
  }
}

function validateBillingReportBackend(reportsPath) {
  const compositionModule = join(reportsPath, "reports.module.ts");
  if (!existsSync(compositionModule))
    missing.push("billing-api/reports: missing reports.module.ts");
  else validateRoleFile(compositionModule, "billing-api/reports", "module");
  if (!existsSync(join(reportsPath, "index.ts"))) {
    missing.push("billing-api/reports: missing index.ts");
  }
  const reportRoles = ["module", "service", "repository", "routes", "types"];
  for (const reportPath of leafDirectories(reportsPath)) {
    const reportName = reportPath.split(/[\\/]/).at(-1);
    const label = `billing-api/reports/${reportName}`;
    for (const role of reportRoles) {
      const filePath = join(reportPath, `${reportName}.${role}.ts`);
      if (!existsSync(filePath)) missing.push(`${label}: missing ${reportName}.${role}.ts`);
      else validateRoleFile(filePath, label, role);
    }
    if (!existsSync(join(reportPath, "index.ts"))) missing.push(`${label}: missing index.ts`);
  }
}

function validateBillingReportFrontend(reportsPath) {
  if (!existsSync(join(reportsPath, "index.ts"))) {
    missing.push("billing-web/reports: missing index.ts");
  }
  for (const reportPath of leafDirectories(reportsPath)) {
    const reportName = reportPath.split(/[\\/]/).at(-1);
    const label = `billing-web/reports/${reportName}`;
    for (const role of requiredFrontendRoles) {
      const extension = ["form", "list", "workspace"].includes(role) ? "tsx" : "ts";
      const filePath = join(reportPath, `${reportName}.${role}.${extension}`);
      if (!existsSync(filePath))
        missing.push(`${label}: missing ${reportName}.${role}.${extension}`);
      else validateRoleFile(filePath, label, role);
    }
    if (!existsSync(join(reportPath, "index.ts"))) missing.push(`${label}: missing index.ts`);
  }
}

function leafDirectories(rootPath) {
  const result = [];
  for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(rootPath, entry.name);
    const childDirectories = readdirSync(path, { withFileTypes: true }).filter((child) =>
      child.isDirectory()
    );
    if (existsSync(join(path, "index.ts")) && childDirectories.length === 0) result.push(path);
    else result.push(...leafDirectories(path));
  }
  return result;
}

function relativeModule(rootPath, modulePath) {
  return modulePath.slice(rootPath.length + 1).replaceAll("\\", "/");
}

function validateRoleFile(filePath, moduleLabel, role) {
  const source = readFileSync(filePath, "utf8").trim();
  if (!source) {
    missing.push(`${moduleLabel}: ${role} role is empty`);
    return;
  }
  for (const pattern of forbiddenScaffoldPatterns) {
    if (pattern.test(source)) {
      missing.push(`${moduleLabel}: ${role} role is scaffold-only or alias-only`);
      return;
    }
  }
  const markers = backendBehaviorMarkers[role];
  if (markers && !markers.some((marker) => source.toLowerCase().includes(marker))) {
    missing.push(`${moduleLabel}: ${role} role has no callable ${markers.join("/")} behavior`);
  }
  if (["form", "list", "workspace"].includes(role) && !/export\s+function\s+\w+/.test(source)) {
    missing.push(`${moduleLabel}: ${role} role must export a real component`);
  }
}
