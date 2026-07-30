import assert from "node:assert/strict";
import { createApp } from "../../apps/platform/api/src/app.js";

const app = await createApp();

try {
  await app.ready();

  const healthResponse = await app.inject({ method: "GET", url: "/health" });
  assert.equal(healthResponse.statusCode, 200);
  const health = healthResponse.json() as {
    data?: { checks?: { "platform-api"?: { details?: { modules?: string[] } } } };
    success?: boolean;
  };
  assert.equal(health.success, true);
  const modules = health.data?.checks?.["platform-api"]?.details?.modules ?? [];
  assert.ok(modules.includes("core.common"), "Core package was not composed into Platform API.");
  assert.ok(
    modules.includes("billing.sales"),
    "Billing package was not composed into Platform API."
  );
  assert.ok(modules.includes("mail"), "Mail package was not composed into Platform API.");

  const corsResponse = await app.inject({
    headers: {
      "access-control-request-headers": "content-type",
      "access-control-request-method": "POST",
      origin: "http://127.0.0.1:7020"
    },
    method: "OPTIONS",
    url: "/auth/login"
  });
  assert.equal(corsResponse.statusCode, 204);
  assert.equal(
    corsResponse.headers["access-control-allow-origin"],
    "http://127.0.0.1:7020",
    "Platform login preflight did not allow the local web origin."
  );
  assert.equal(corsResponse.headers["access-control-allow-credentials"], "true");

  const rejectedCorsResponse = await app.inject({
    headers: {
      "access-control-request-method": "POST",
      origin: "https://untrusted.example"
    },
    method: "OPTIONS",
    url: "/auth/login"
  });
  assert.equal(
    rejectedCorsResponse.headers["access-control-allow-origin"],
    undefined,
    "Platform API reflected an unconfigured web origin."
  );

  const coreResponse = await app.inject({
    headers: {
      "x-tenant-db": "codexsun_composed_runtime_probe",
      "x-tenant-id": "00000000"
    },
    method: "GET",
    url: "/core/common/location/countries"
  });
  assert.equal(coreResponse.statusCode, 401, "Core route is not protected inside Platform API.");

  const billingResponse = await app.inject({
    headers: {
      "x-company-id": "1",
      "x-financial-year-id": "1",
      "x-tenant-db": "codexsun_composed_runtime_probe",
      "x-tenant-id": "00000000"
    },
    method: "GET",
    url: "/billing/quotations"
  });
  assert.equal(
    billingResponse.statusCode,
    401,
    "Billing route is not protected inside Platform API."
  );

  console.log("Composed Platform runtime E2E passed", {
    apiPort: 7010,
    composedPackages: ["core", "billing", "mail"],
    corsOrigin: "http://127.0.0.1:7020",
    webPort: 7020
  });
} finally {
  await app.close();
}
