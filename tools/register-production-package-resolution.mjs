import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiPackages = new Map([
  ["@cxapp/accounts-api", "accounts"],
  ["@cxapp/billing-api", "billing"],
  ["@cxapp/core-api", "core"],
  ["@cxapp/devkit-api", "devkit"],
  ["@cxapp/mail-api", "mail"]
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = productionApiTarget(specifier);
    if (target) return { shortCircuit: true, url: pathToFileURL(target).href };
    return nextResolve(specifier, context);
  }
});

function productionApiTarget(specifier) {
  for (const [packageName, app] of apiPackages) {
    if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) continue;
    const subpath = specifier.slice(packageName.length + 1);
    const base = resolve(root, "dist", "apps", app, "api");
    const candidates = subpath
      ? [resolve(base, `${subpath}.js`), resolve(base, subpath, "index.js")]
      : [resolve(base, "index.js")];
    const target = candidates.find((candidate) => existsSync(candidate));
    if (!target) {
      throw new Error(`Production build output is missing for ${specifier}. Run npm run build.`);
    }
    return target;
  }
  return null;
}
