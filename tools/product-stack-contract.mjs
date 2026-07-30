function stack({
  databaseScopes,
  formula,
  foundationServices,
  ownedDatabaseScopes,
  productServices,
  releaseTagPrefix
}) {
  return Object.freeze({
    databaseScopes: Object.freeze(databaseScopes),
    deploymentPolicy: "composed-platform-release",
    formula: Object.freeze(formula),
    foundationServices: Object.freeze(foundationServices),
    migrationPolicy: "expand-contract-with-product-scoped-rollback",
    ownedDatabaseScopes: Object.freeze(ownedDatabaseScopes),
    productServices: Object.freeze(productServices),
    releaseTagPrefix,
    services: Object.freeze([...foundationServices, ...productServices])
  });
}

export const productStackContract = Object.freeze({
  billing: stack({
    databaseScopes: ["platform-master", "tenant-core", "tenant-billing"],
    formula: ["framework", "platform", "core", "billing"],
    foundationServices: [],
    ownedDatabaseScopes: ["tenant-billing"],
    productServices: ["platform-api", "platform-web"],
    releaseTagPrefix: "v-billing-"
  })
});

export function affectedProductStacks(paths) {
  const affected = new Set();
  for (const input of paths) {
    const path = String(input).replace(/\\/gu, "/");
    if (path.startsWith("apps/billing/")) affected.add("billing");
    else if (
      path.startsWith("apps/platform/") ||
      path.startsWith("apps/core/") ||
      path.startsWith("packages/framework/") ||
      path.startsWith("packages/ui/") ||
      path === "package.json" ||
      path === "package-lock.json" ||
      path === "tools/dev-stack.mjs" ||
      path === "tools/dev-stack-health.mjs" ||
      path === "tools/product-stack-contract.mjs" ||
      path === "tools/product-stack-contract.test.mjs"
    ) {
      Object.keys(productStackContract).forEach((name) => affected.add(name));
    }
  }
  return Object.keys(productStackContract).filter((name) => affected.has(name));
}
