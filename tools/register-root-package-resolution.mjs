import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const rootPackageUrl = pathToFileURL(resolve(import.meta.dirname, "../package.json")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !isBareSpecifier(specifier)) {
        throw error;
      }

      return nextResolve(specifier, { ...context, parentURL: rootPackageUrl });
    }
  }
});

function isBareSpecifier(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.includes(":");
}
