import assert from "node:assert/strict";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { createApp } from "../../apps/platform/api/src/app.js";
import { closePlatformDatabase } from "../../apps/platform/api/src/database/platform-database.js";
import { closeAllTenantDatabases } from "../../apps/platform/api/src/database/tenant-database.js";
import { env } from "../../apps/platform/api/src/env.js";
import { signAuthToken } from "../../apps/platform/api/src/auth/jwt.js";

type TenantRow = RowDataPacket & { db_name: string; tenant_code: string; uuid: string };
type RecordValue = { id: number; status: string } & Record<string, unknown>;
const run = Date.now().toString(36);
const connection = await createConnection({
  database: env.DB_MASTER_NAME,
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});
const app = await createApp();

try {
  const [tenants] = await connection.query<TenantRow[]>(
    "SELECT uuid, tenant_code, db_name FROM tenants WHERE status='active' ORDER BY id LIMIT 5"
  );
  assert.equal(tenants.length, 5, "Five active tenants are required for the access isolation E2E.");
  const results: Array<{ tenant: string; records: number }> = [];
  for (const tenant of tenants) results.push(await exerciseTenant(tenant));

  const first = tenants[0]!;
  const second = tenants[1]!;
  const crossed = await request(first, "GET", "/tenant/access/users", undefined, second.db_name);
  assert.equal(
    crossed.statusCode,
    403,
    "A tenant token was accepted against another tenant database."
  );

  console.log("Tenant access five-tenant E2E passed", { results, tenants: tenants.length });
} finally {
  await app.close();
  await closeAllTenantDatabases();
  await closePlatformDatabase();
  await connection.end();
}

async function exerciseTenant(tenant: TenantRow) {
  for (const resource of ["users", "roles", "permissions", "user-roles", "role-permissions"]) {
    const listed = await request(tenant, "GET", `/tenant/access/${resource}`);
    assert.equal(listed.statusCode, 200, `${tenant.tenant_code} could not list ${resource}.`);
  }

  const role = await create(tenant, "roles", {
    description: `E2E role ${run}`,
    key: `e2e-${run}`,
    label: `E2E Role ${run}`,
    status: "active"
  });
  const permission = await create(tenant, "permissions", {
    description: `E2E permission ${run}`,
    key: `e2e.${run}.read`,
    label: `E2E Permission ${run}`,
    status: "active"
  });
  const user = await create(tenant, "users", {
    email: `e2e-${run}@${tenant.tenant_code.toLowerCase()}.test`,
    name: `E2E User ${run}`,
    password: "Codexsun-E2E-123!",
    status: "active"
  });
  const userRole = await create(tenant, "user-roles", {
    roleId: role.id,
    status: "active",
    userId: user.id
  });
  const rolePermission = await create(tenant, "role-permissions", {
    permissionId: permission.id,
    roleId: role.id,
    status: "active"
  });

  for (const [resource, record] of [
    ["users", user],
    ["roles", role],
    ["permissions", permission],
    ["user-roles", userRole],
    ["role-permissions", rolePermission]
  ] as const) {
    const shown = await request(tenant, "GET", `/tenant/access/${resource}/${record.id}`);
    assert.equal(shown.statusCode, 200, `${resource} read failed.`);
    assert.equal((shown.data as RecordValue).id, record.id);
    const off = await request(tenant, "POST", `/tenant/access/${resource}/${record.id}/deactivate`);
    assert.equal(off.statusCode, 200, `${resource} deactivate failed.`);
    assert.equal((off.data as RecordValue).status, "inactive");
    const on = await request(tenant, "POST", `/tenant/access/${resource}/${record.id}/activate`);
    assert.equal(on.statusCode, 200, `${resource} activate failed.`);
  }

  for (const [resource, record] of [
    ["role-permissions", rolePermission],
    ["user-roles", userRole],
    ["permissions", permission],
    ["roles", role],
    ["users", user]
  ] as const) {
    const removed = await request(
      tenant,
      "DELETE",
      `/tenant/access/${resource}/${record.id}/force`
    );
    assert.equal(removed.statusCode, 200, `${resource} force delete failed.`);
  }
  return { records: 5, tenant: tenant.tenant_code };
}

async function create(tenant: TenantRow, resource: string, payload: unknown) {
  const response = await request(tenant, "POST", `/tenant/access/${resource}`, payload);
  assert.equal(response.statusCode, 200, `${tenant.tenant_code} ${resource} create failed.`);
  return response.data as RecordValue;
}

async function request(
  tenant: TenantRow,
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown,
  databaseName = tenant.db_name
) {
  await connection.changeUser({ database: tenant.db_name });
  const [users] = await connection.query<Array<RowDataPacket & { email: string; uuid: string }>>(
    "SELECT email, uuid FROM users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1"
  );
  const admin = users[0];
  assert.ok(admin, `${tenant.tenant_code} administrator was not seeded.`);
  const token = signAuthToken({
    email: admin.email,
    tenantCode: tenant.tenant_code,
    tenantDbName: tenant.db_name,
    tenantId: tenant.uuid,
    tenantUuid: tenant.uuid,
    userId: admin.uuid,
    userType: "tenant"
  });
  const response = await app.inject({
    headers: {
      authorization: `Bearer ${token}`,
      "x-tenant-db": databaseName,
      "x-tenant-id": tenant.uuid
    },
    method,
    ...(payload === undefined ? {} : { payload }),
    url
  });
  const envelope = response.json() as { data?: unknown; error?: { message?: string } };
  return { data: envelope.data, error: envelope.error, statusCode: response.statusCode };
}
