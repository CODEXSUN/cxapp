import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

for (const directory of ["platform-registry-json"]) {
  const source = fileURLToPath(new URL(`../apps/devkit/api/${directory}/`, import.meta.url));
  const target = fileURLToPath(new URL(`../dist/apps/devkit/api/${directory}/`, import.meta.url));
  await mkdir(target, { recursive: true });
  await cp(source, target, { force: true, recursive: true });
  console.info(`[assets] DevKit ${directory} copied to ${target}`);
}
