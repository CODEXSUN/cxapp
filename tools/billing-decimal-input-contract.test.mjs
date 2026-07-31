import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modules = ["quotation", "sales", "purchase", "receipt", "payment", "export-sales"];

async function sources(root, suffix) {
  return Promise.all(
    modules.map(async (module) => ({
      module,
      source: await readFile(`${root}/${module}/${module}.${suffix}`, "utf8")
    }))
  );
}

test("billing transaction forms keep decimal values in normal text inputs", async () => {
  const formFiles = await Promise.all(
    modules.map(async (module) => {
      const names =
        module === "receipt" || module === "payment"
          ? [`${module}.form.tsx`]
          : [`${module}.form-section-3.tsx`];
      return {
        module,
        source: (
          await Promise.all(
            names.map((name) => readFile(`apps/billing/web/src/modules/${module}/${name}`, "utf8"))
          )
        ).join("\n")
      };
    })
  );

  for (const { module, source } of formFiles) {
    assert.doesNotMatch(source, /type="number"/, `${module} must not use native number inputs`);
    assert.doesNotMatch(
      source,
      /Number\(event\.target\.value/,
      `${module} must preserve decimal text while typing`
    );
    assert.match(source, /inputMode="decimal"/, `${module} must retain a decimal keyboard hint`);
  }
});

test("billing owner routes parse decimal request strings before service processing", async () => {
  const routeFiles = await sources("apps/billing/api/src/modules", "routes.ts");
  const expectedCoercions = {
    "export-sales": 4,
    payment: 5,
    purchase: 4,
    quotation: 4,
    receipt: 5,
    sales: 4
  };

  for (const { module, source } of routeFiles) {
    const coercions = source.match(/z\.coerce\.number\(\)\.finite\(\)/g) ?? [];
    assert.ok(
      coercions.length >= expectedCoercions[module],
      `${module} must parse every editable quantity, rate, amount, allocation, and round-off field`
    );
  }
});
