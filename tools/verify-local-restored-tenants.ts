import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createConnection } from "mysql2/promise";
import { env } from "../apps/platform/api/src/env.js";
import { signAuthToken } from "../apps/platform/api/src/auth/jwt.js";
assert.equal(env.DB_HOST, "127.0.0.1");
assert.equal(env.DB_PORT, 3306);
assert.equal(env.DB_MASTER_NAME, "cxvps_20261113_124552_master");
assert.equal(env.CXAPP_QUEUE_WORKER_ENABLED, "0");
assert.equal(env.MAIL_ENABLED, "0");
assert.equal(env.CXAPP_DB_FRESH_ON_START, "0");
assert.equal(env.ENABLE_DEFAULT_TENANT_SEED, "0");
const c = await createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_MASTER_NAME
});
const root = "http://127.0.0.1:" + env.PLATFORM_API_PORT;
async function get(path: string, token: string, extra: Record<string, string> = {}) {
  const r = await fetch(root + path, {
    headers: { authorization: "Bearer " + token, ...extra },
    signal: AbortSignal.timeout(30000)
  });
  const data = await r.json();
  return { status: r.status, data: data.data, error: data.error?.message };
}
const quote = (s: string) => {
  assert.match(s, /^[a-zA-Z0-9_]+$/);
  return "`" + s + "`";
};
const results = [];
try {
  const sa = signAuthToken({
    email: "local-verification@localhost",
    userId: "local-verification",
    userType: "super_admin"
  });
  const master = await get("/admin/database/master", sa);
  assert.equal(master.status, 200, master.error);
  assert.equal(master.data.databaseName, env.DB_MASTER_NAME);
  const config = await get("/admin/backups/config", sa);
  assert.equal(config.status, 200, config.error);
  assert.equal(config.data.tenants.length, 12);
  const [tenants] = await c.query<any[]>(
    "SELECT id,uuid,tenant_code,db_name,db_host,db_port,status FROM tenants ORDER BY id"
  );
  assert.equal(tenants.length, 12);
  for (const t of tenants) {
    assert.equal(t.db_host, "127.0.0.1");
    assert.equal(Number(t.db_port), 3306);
    assert.ok(t.db_name.startsWith("cxvps_20261113_124552_"));
    assert.equal(t.status, "active");
    const [users] = await c.query<any[]>(
      "SELECT uuid,email FROM " +
        quote(t.db_name) +
        ".app_users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1"
    );
    assert.ok(users[0], t.tenant_code + " has no active admin");
    const token = signAuthToken({
      email: users[0].email,
      userId: users[0].uuid,
      userType: "tenant",
      tenantId: t.uuid,
      tenantUuid: t.uuid,
      tenantCode: t.tenant_code,
      tenantDbName: t.db_name
    });
    const [companies] = await c.query<any[]>(
      "SELECT id FROM " +
        quote(t.db_name) +
        ".core_companies WHERE status='active' ORDER BY id LIMIT 1"
    );
    const [years] = await c.query<any[]>(
      "SELECT id FROM " +
        quote(t.db_name) +
        ".core_financial_years WHERE status='active' ORDER BY is_current DESC,id DESC LIMIT 1"
    );
    assert.ok(companies[0] && years[0], t.tenant_code + " company/year context missing");
    const context = {
      "x-company-id": String(companies[0].id),
      "x-financial-year-id": String(years[0].id)
    };
    const checks = [];
    for (const path of [
      "/tenant/runtime",
      "/tenant/industries",
      "/core/organisation/companies",
      "/billing/sales/page?page=1&pageSize=10"
    ]) {
      const response = await get(path, token, context);
      checks.push({ path, status: response.status, error: response.error });
      if (path === "/tenant/runtime" && response.status === 200) {
        assert.equal(response.data.tenant.dbName, t.db_name);
        assert.equal(response.data.tenant.tenantCode, t.tenant_code);
      }
    }
    const other = tenants.find((o) => o.uuid !== t.uuid);
    const isolated = await get("/tenant/runtime", token, {
      "x-tenant-id": other.uuid,
      "x-tenant-db": other.db_name
    });
    assert.equal(isolated.status, 200, isolated.error);
    assert.equal(isolated.data.tenant.dbName, t.db_name);
    const result = {
      tenant: t.tenant_code,
      database: t.db_name,
      checks,
      isolation: "passed",
      passed: checks.every((r) => r.status === 200)
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const web = await fetch("http://127.0.0.1:" + env.PLATFORM_WEB_PORT + "/sa/tenant-backups", {
    signal: AbortSignal.timeout(10000)
  });
  const report = {
    masterDatabase: env.DB_MASTER_NAME,
    localApi: root,
    localWeb: "http://127.0.0.1:" + env.PLATFORM_WEB_PORT,
    tenants: results,
    queueWorkerEnabled: false,
    outgoingMailEnabled: false,
    defaultSeedEnabled: false,
    webStatus: web.status,
    verificationMethod:
      "Live local HTTP API requests authenticated with short-lived internal test tokens for existing tenant administrators; no passwords reset or exposed.",
    vpsAccess: false
  };
  await fs.writeFile(
    "docs/local-restored-tenants-verification.json",
    JSON.stringify(report, null, 2) + "\n"
  );
  assert.ok(
    results.every((r) => r.passed),
    "Some tenant API checks failed; see report"
  );
  assert.equal(web.status, 200);
  console.log(
    "ALL 12 TENANTS PASSED live local API, tenant isolation, database mapping and web availability checks."
  );
} finally {
  await c.end();
}
