import assert from "node:assert/strict";
import test from "node:test";
import {
  platformApiUrl,
  platformWebAllowedHosts,
  resolvePlatformRuntime
} from "../packages/framework/env.js";

test("platform runtime derives development binding and loopback API URL", () => {
  assert.deepEqual(
    resolvePlatformRuntime({
      NODE_ENV: "development",
      PLATFORM_API_PORT: 7010
    }),
    {
      apiBindHost: "127.0.0.1",
      apiUrl: "http://127.0.0.1:7010",
      webBindHost: "127.0.0.1"
    }
  );
});

test("platform runtime derives production binding without changing the internal API URL", () => {
  assert.deepEqual(
    resolvePlatformRuntime({
      NODE_ENV: "production",
      PLATFORM_API_PORT: 17010
    }),
    {
      apiBindHost: "0.0.0.0",
      apiUrl: "http://127.0.0.1:17010",
      webBindHost: "0.0.0.0"
    }
  );
});

test("web allowed hosts come from the canonical origin and local development aliases", () => {
  assert.deepEqual(platformWebAllowedHosts("https://app.codexsun.com"), [
    "app.codexsun.com",
    "localhost",
    "127.0.0.1"
  ]);
  assert.deepEqual(platformWebAllowedHosts("http://localhost:7020"), ["localhost", "127.0.0.1"]);
});

test("derived runtime rejects invalid ports and origins", () => {
  assert.throws(() => platformApiUrl(0), /PLATFORM_API_PORT/u);
  assert.throws(() => platformWebAllowedHosts("not-a-url"), /Invalid URL/u);
  assert.throws(
    () => resolvePlatformRuntime({ NODE_ENV: "invalid", PLATFORM_API_PORT: 7010 }),
    /NODE_ENV/u
  );
});
