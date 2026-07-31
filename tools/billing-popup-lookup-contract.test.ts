import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { coreLookupMutationSchema } from "../apps/billing/api/src/shared/core-lookup.contracts";

const documentModules = ["quotation", "sales", "purchase", "export-sales"];

test("billing lookup gateway accepts every product popup lookup owner payload", () => {
  const payloads = [
    { isActive: true, name: "Garments" },
    { code: "6109", description: "T-shirts", isActive: true },
    { isActive: true, name: "Nos" },
    { description: "18", isActive: true, ratePercent: 18 }
  ];

  for (const payload of payloads) {
    const result = coreLookupMutationSchema.safeParse(payload);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
  }
});

test("billing lookup gateway rejects an identity-free named lookup", () => {
  assert.equal(coreLookupMutationSchema.safeParse({ isActive: true }).success, false);
});

test("product edits submit only the Core owner fields and tolerate the no-tax sentinel", async () => {
  const expected = {
    hsnCodeId: "1",
    isActive: true,
    name: "Sentinel product",
    openingRate: 0,
    productCategoryId: "1",
    taxId: "1",
    unitId: "1"
  };
  assert.equal(coreLookupMutationSchema.safeParse(expected).success, true);

  for (const module of documentModules) {
    const source = await readFile(
      `apps/billing/web/src/modules/${module}/${module}.form-section-2.tsx`,
      "utf8"
    );
    const productBranch = source.match(/kind === "products"\s*\?\s*(\{[\s\S]*?\})\s*:\s*\{/)?.[1];
    assert.ok(productBranch, `${module} product payload branch`);
    for (const displayField of [
      "code:",
      "hsnCode:",
      "productCategoryName:",
      "taxName:",
      "taxRate:",
      "unitName:"
    ]) {
      assert.doesNotMatch(productBranch, new RegExp(displayField), `${module} ${displayField}`);
    }
  }
});

test("billing product and address popups use top banners and invalid control rings", async () => {
  for (const module of documentModules) {
    const lookupSection =
      module === "sales" || module === "export-sales"
        ? `${module}.form-section-5.tsx`
        : `${module}.form-section-4.tsx`;
    const [product, lookup, address] = await Promise.all([
      readFile(`apps/billing/web/src/modules/${module}/${module}.form-section-4.tsx`, "utf8"),
      readFile(`apps/billing/web/src/modules/${module}/${lookupSection}`, "utf8"),
      readFile(`apps/billing/web/src/modules/${module}/${module}-address-editor.tsx`, "utf8")
    ]);

    assert.match(product, /WorkspaceFormBanner/, `${module} product banner`);
    assert.match(product, /invalid=\{saveAttempted/, `${module} product invalid ring`);
    assert.match(product, /noValidate/, `${module} product custom validation`);
    assert.doesNotMatch(product, /type="number"/, `${module} product decimal text input`);
    assert.match(
      product,
      /const categoryOptions[\s\S]*?value: String\(record\.id\)/,
      `${module} category persisted identity`
    );
    assert.match(
      product,
      /const unitOptions[\s\S]*?value: String\(record\.id\)/,
      `${module} unit persisted identity`
    );
    assert.match(
      product,
      /const taxOptions[\s\S]*?label: taxRateLabel\(record\)[\s\S]*?value: String\(record\.id\)/,
      `${module} formatted tax rate label`
    );
    assert.match(product, /description: String\(taxRate\)/, `${module} canonical tax persistence`);
    assert.match(product, /return Number\.isFinite\(rate\) \? `\$\{rate\}%` : "-"/);
    assert.match(
      lookup,
      /return \{ \.\.\.[a-zA-Z]+CommonOption\(record\), value: String\(record\.id\) \};/,
      `${module} created lookup persisted identity`
    );
    assert.match(address, /WorkspaceFormBanner/, `${module} address banner`);
    assert.match(address, /noValidate/, `${module} address custom validation`);
    assert.match(address, /Address type <span className="text-destructive">\*<\/span>/);
    assert.match(address, /invalid=\{saveAttempted && !form\.countryId\}/);
    assert.doesNotMatch(address, /FieldError|helper/i, `${module} address helper text`);
  }
});

test("billing work order popups require code with top banners and invalid control rings", async () => {
  const input = await readFile("packages/ui/src/components/input.tsx", "utf8");
  assert.match(input, /aria-invalid:border-destructive/, "invalid input red border");
  assert.match(
    input,
    /aria-invalid:focus-visible:ring-destructive/,
    "focused invalid input red ring"
  );

  for (const module of documentModules) {
    const workOrder = await readFile(
      `apps/billing/web/src/modules/${module}/${module}.form-section-2.tsx`,
      "utf8"
    );

    assert.match(workOrder, /WorkspaceFormBanner/, `${module} work order banner`);
    assert.match(workOrder, /noValidate/, `${module} work order custom validation`);
    assert.match(workOrder, /label="Code"\s+required/, `${module} work order code marker`);
    assert.match(workOrder, /invalid=\{saveAttempted && codeMissing\}/, `${module} code ring`);
    assert.match(workOrder, /Work order code is required\./, `${module} code message`);
    assert.doesNotMatch(workOrder, /FieldError|helper/i, `${module} work order helper text`);
  }
});

test("billing product saves invalidate the public Core Product Master cache", async () => {
  const productIndex = await readFile("apps/core/web/src/modules/master/product/index.ts", "utf8");
  assert.match(productIndex, /export \{ productsQueryKey \}/, "Core public product query key");

  for (const module of documentModules) {
    const controller = await readFile(
      `apps/billing/web/src/modules/${module}/${module}.form-controller.tsx`,
      "utf8"
    );
    assert.match(controller, /productsQueryKey/, `${module} Core product cache contract`);
    assert.match(
      controller,
      /variables\.kind === "products"[\s\S]*?invalidateQueries\(\{ queryKey: productsQueryKey \}\)/,
      `${module} live Product Master invalidation`
    );
  }
});
