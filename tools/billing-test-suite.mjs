import { spawnSync } from "node:child_process";

const database = process.argv.includes("--database");
const unknown = process.argv.slice(2).filter((argument) => argument !== "--database");
if (unknown.length) throw new Error(`Unknown Billing test options: ${unknown.join(", ")}`);

const unitTests = [
  "apps/billing/api/src/modules/quotation/quotation.money.test.ts",
  "apps/billing/api/src/modules/quotation/quotation.conversion.test.ts",
  "apps/billing/api/src/modules/sales/sales.money.test.ts",
  "apps/billing/api/src/modules/purchase/purchase.money.test.ts",
  "apps/billing/api/src/modules/export-sales/export-sales.money.test.ts",
  "apps/billing/api/src/modules/reports/customer-statement/customer-statement.ageing.test.ts",
  "apps/billing/api/src/modules/reports/supplier-statement/supplier-statement.ageing.test.ts",
  "apps/billing/web/src/modules/receipt/receipt.allocation.test.ts",
  "apps/billing/web/src/modules/payment/payment.allocation.test.ts"
];
const stages = [{ name: "Billing unit regressions", args: ["--test", ...unitTests] }];
if (database) {
  stages.push(
    { name: "Isolated allocation guards", args: ["tools/e2e/billing-allocation-guards.e2e.ts"] },
    {
      name: "Isolated quotation conversion",
      args: ["apps/billing/api/src/modules/quotation/quotation.e2e.ts"]
    }
  );
}
let failed = false;
for (const stage of stages) {
  console.log(`\nBilling test stage: ${stage.name}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", ...stage.args], {
    stdio: "inherit",
    env: process.env
  });
  if (result.error) console.error(result.error.message);
  const passed = !result.error && result.status === 0;
  console.log(`${passed ? "PASS" : "FAIL"}: ${stage.name}`);
  failed ||= !passed;
}
if (!database) console.log("Database and browser verification were not run.");
console.log("This suite does not certify unimplemented Billing tasks or browser printing.");
process.exitCode = failed ? 1 : 0;
