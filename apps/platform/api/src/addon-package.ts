import { readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

type VersionedAddonManifest = { version: string };

export function withInstalledAddonVersion<T extends VersionedAddonManifest>(
  packageName: string,
  contractSpecifier: string,
  manifest: T
): T {
  const entry = fileURLToPath(import.meta.resolve(contractSpecifier));
  const version = findInstalledPackageVersion(dirname(entry), packageName);
  return manifest.version === version ? manifest : { ...manifest, version };
}

function findInstalledPackageVersion(directory: string, packageName: string): string {
  const root = parse(directory).root;
  let current = directory;

  while (current !== root) {
    const packageFile = join(current, "package.json");
    try {
      const pkg = JSON.parse(readFileSync(packageFile, "utf8")) as {
        name?: unknown;
        version?: unknown;
      };
      if (pkg.name === packageName && typeof pkg.version === "string" && pkg.version) {
        return pkg.version;
      }
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    current = dirname(current);
  }

  throw new Error(`Could not resolve installed package metadata for ${packageName}.`);
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
