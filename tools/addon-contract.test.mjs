import assert from "node:assert/strict";
import test from "node:test";
import { AddonHostRegistry } from "../dist/packages/framework/addons/index.js";

const manifest = {
  capabilities: { required: ["identity", "database"] },
  compatibleHosts: "host-adapter",
  databaseModes: ["host-database"],
  displayName: "Test add-on",
  hostApi: "^1.0.0",
  key: "codexsun.test-addon",
  kind: "composable-addon-application",
  packages: { api: "test/api", contracts: "test/contracts", web: "test/web" },
  runtimeModes: ["multi-tenant", "single-client"],
  schemaVersion: 1,
  version: "1.0.0",
};

test("registers compatible add-ons and closes them in reverse order", async () => {
  const events = [];
  const registry = new AddonHostRegistry({
    capabilities: ["identity", "database"],
    runtimeMode: "multi-tenant",
  });
  for (const suffix of ["one", "two"]) {
    await registry.register({
      activate: async () => events.push(`open:${suffix}`),
      close: async () => events.push(`close:${suffix}`),
      databaseMode: "host-database",
      manifest: { ...manifest, key: `codexsun.test-${suffix}` },
      moduleKeys: [`test.${suffix}`],
    });
  }
  assert.deepEqual(registry.moduleKeys(), ["test.one", "test.two"]);
  await registry.close();
  assert.deepEqual(events, ["open:one", "open:two", "close:two", "close:one"]);
});

test("rejects missing host capabilities before activation", async () => {
  let activated = false;
  const registry = new AddonHostRegistry({ capabilities: ["identity"], runtimeMode: "multi-tenant" });
  await assert.rejects(
    registry.register({
      activate: async () => {
        activated = true;
      },
      databaseMode: "host-database",
      manifest,
      moduleKeys: [],
    }),
    /unavailable capabilities: database/,
  );
  assert.equal(activated, false);
});

test("rejects incompatible runtime and host API versions", async () => {
  const registry = new AddonHostRegistry({
    capabilities: ["identity", "database"],
    runtimeMode: "multi-tenant",
  });
  const registration = {
    activate: async () => undefined,
    databaseMode: "host-database",
    manifest: { ...manifest, hostApi: "^2.0.0" },
    moduleKeys: [],
  };
  await assert.rejects(registry.register(registration), /requires host API/);
});
test("cleans a partially started add-on when activation fails", async () => {
  let closed = false;
  const registry = new AddonHostRegistry({
    capabilities: ["identity", "database"],
    runtimeMode: "multi-tenant",
  });
  await assert.rejects(
    registry.register({
      activate: async () => {
        throw new Error("activation failed");
      },
      close: async () => {
        closed = true;
      },
      databaseMode: "host-database",
      manifest,
      moduleKeys: [],
    }),
    /activation failed/,
  );
  assert.equal(closed, true);
  assert.deepEqual(registry.list(), []);
});
