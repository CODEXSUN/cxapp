import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveDevkitSeedDirectory(moduleUrl: string, directory: string) {
  const moduleDirectory = dirname(fileURLToPath(moduleUrl));
  const candidates = [
    join(moduleDirectory, "../../../", directory),
    join(process.cwd(), "apps/devkit/api", directory),
    join(process.cwd(), "dist/apps/devkit/api", directory),
    join(moduleDirectory, "../../../../src/api", directory)
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(`DevKit seed directory is unavailable: ${directory}.`);
  }
  return resolved;
}
