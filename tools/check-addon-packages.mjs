#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageFiles = ["apps/platform/api/package.json", "apps/platform/web/package.json"];
const addons = [
  {
    contract: "@codexsun/blog/contracts",
    manifestExport: "blogPluginManifest",
    name: "@codexsun/blog"
  },
  {
    contract: "@codexsun/file-manager/contracts",
    normalizeManifestVersion: true,
    manifestExport: "fileManagerPluginManifest",
    name: "@codexsun/file-manager"
  }
];

const lock = readJson("package-lock.json");

for (const addon of addons) {
  addon.version = declaredVersion(addon.name);
  verifyWorkspacePins(addon);
  verifyRegistryLock(addon);
  await verifyOwnerManifest(addon);
}

console.log(
  `Add-on npm packages verified: ${addons.map(({ name, version }) => `${name}@${version}`).join(", ")}`
);

function verifyWorkspacePins(addon) {
  for (const file of packageFiles) {
    const pkg = readJson(file);
    if (pkg.dependencies?.[addon.name] !== addon.version) {
      throw new Error(`${file} must pin ${addon.name} exactly to ${addon.version}.`);
    }
    const workspace = file.replace(/[/\\]package\.json$/u, "");
    const locked = lock.packages?.[workspace]?.dependencies?.[addon.name];
    if (locked !== addon.version) {
      throw new Error(
        `package-lock.json does not match ${file} for ${addon.name}@${addon.version}.`
      );
    }
  }
}

function declaredVersion(name) {
  const version = readJson(packageFiles[0]).dependencies?.[name];
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error(`${packageFiles[0]} must pin ${name} to an exact semantic version.`);
  }
  return version;
}

function verifyRegistryLock(addon) {
  const installed = lock.packages?.[`node_modules/${addon.name}`];
  if (installed?.version !== addon.version) {
    throw new Error(`package-lock.json does not install ${addon.name}@${addon.version}.`);
  }
  if (!installed.resolved?.startsWith("https://registry.npmjs.org/")) {
    throw new Error(`${addon.name} must resolve from the npm registry, not Git or a local folder.`);
  }
  if (!installed.integrity) throw new Error(`${addon.name} is missing npm integrity metadata.`);

  const packageJson = readJson(`node_modules/${addon.name}/package.json`);
  if (packageJson.name !== addon.name || packageJson.version !== addon.version) {
    throw new Error(`${addon.name} installed package metadata does not match ${addon.version}.`);
  }
}

async function verifyOwnerManifest(addon) {
  const contracts = await import(addon.contract);
  const manifest = contracts[addon.manifestExport];
  if (manifest?.version !== addon.version) {
    if (!addon.normalizeManifestVersion) {
      throw new Error(
        `${addon.contract} reports ${manifest?.version ?? "no version"}; npm installs ${addon.version}.`
      );
    }
    console.log(
      `Host compatibility: ${addon.name} manifest ${manifest?.version ?? "missing"} is normalized to installed version ${addon.version}.`
    );
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), "utf8"));
}
