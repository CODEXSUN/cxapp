import assert from "node:assert/strict";
import { createServer } from "node:net";

const port = await availablePort();
process.env.PLATFORM_API_PORT = String(port);

const { createApp } = await import("../../apps/platform/api/src/app.js");
const app = await createApp();

try {
  await app.listen({ host: "127.0.0.1", port });

  const applicationHost = new URL(process.env.PLATFORM_WEB_ORIGIN ?? "http://app.codexsun.test");
  const loginResponse = await app.inject({
    headers: {
      host: applicationHost.host,
      origin: applicationHost.origin
    },
    method: "POST",
    url: "/auth/development/tenant-login"
  });
  assert.equal(loginResponse.statusCode, 200, loginResponse.body);

  const sessionCookie = loginResponse.cookies.findLast(
    (cookie) => cookie.name.endsWith("cxapp_session") && cookie.value.length > 0
  );
  assert.ok(sessionCookie, "Development login did not issue a session cookie.");

  const coreResponse = await app.inject({
    headers: {
      cookie: `${sessionCookie.name}=${sessionCookie.value}`,
      host: applicationHost.host,
      origin: applicationHost.origin
    },
    method: "GET",
    url: "/core/organisation/companies?search="
  });
  assert.equal(
    coreResponse.statusCode,
    200,
    `The tenant session was rejected by the composed Core API: ${coreResponse.body}`
  );

  const defaultCompanyResponse = await app.inject({
    headers: {
      cookie: `${sessionCookie.name}=${sessionCookie.value}`,
      host: applicationHost.host,
      origin: applicationHost.origin
    },
    method: "GET",
    url: "/core/organisation/default-company"
  });
  assert.equal(defaultCompanyResponse.statusCode, 200, defaultCompanyResponse.body);
  const defaultCompany = defaultCompanyResponse.json().data as {
    companyId: number;
    financialYearId: number;
  };
  assert.ok(
    defaultCompany.companyId > 0,
    "Default Company did not provide a persisted company ID."
  );
  assert.ok(
    defaultCompany.financialYearId > 0,
    "Default Company did not provide a persisted financial-year ID."
  );

  const scopedHeaders = {
    cookie: `${sessionCookie.name}=${sessionCookie.value}`,
    host: applicationHost.host,
    origin: applicationHost.origin,
    "x-company-id": String(defaultCompany.companyId),
    "x-financial-year-id": String(defaultCompany.financialYearId)
  };

  for (const path of [
    "/core/common/products/units",
    "/core/master/products",
    "/billing/quotations/lookups/units",
    "/billing/quotations/lookups/products",
    "/billing/sales/lookups/units",
    "/billing/sales/lookups/products",
    "/billing/purchases/lookups/units",
    "/billing/purchases/lookups/products",
    "/billing/export-sales/lookups/units",
    "/billing/export-sales/lookups/products"
  ]) {
    const response = await app.inject({
      headers: scopedHeaders,
      method: "GET",
      url: path
    });
    assert.equal(
      response.statusCode,
      200,
      `${path} failed through the composed API: ${response.body}`
    );
    const records = response.json().data as Array<{
      name?: string | null;
      unitId?: number | string;
    }>;
    assert.ok(Array.isArray(records), `${path} did not return a lookup collection.`);
    if (path.endsWith("/products")) {
      const productsWithoutUnits = records.filter(
        (record) => !Number.isInteger(Number(record.unitId)) || Number(record.unitId) <= 0
      );
      assert.deepEqual(
        productsWithoutUnits,
        [],
        `${path} returned products without persisted units: ${productsWithoutUnits
          .slice(0, 5)
          .map((record) => record.name)
          .join(", ")}`
      );
    }
  }

  console.log("Tenant session remained valid across Platform, Core, and Billing lookups.");
} finally {
  await app.close();
}

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate an E2E API port.")));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}
