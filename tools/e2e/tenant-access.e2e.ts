import assert from "node:assert/strict";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { createApp } from "../../apps/platform/api/src/app.js";
import { closePlatformDatabase } from "../../apps/platform/api/src/database/platform-database.js";
import { closeAllTenantDatabases } from "../../apps/platform/api/src/database/tenant-database.js";
import { env } from "../../apps/platform/api/src/env.js";
import { signAuthToken } from "../../apps/platform/api/src/auth/jwt.js";

type TenantRow = RowDataPacket & { db_name: string; id: number; tenant_code: string; uuid: string };
type RecordValue = { id: number; status: string } & Record<string, unknown>;
const run = Date.now().toString(36);
const superAdminToken = signAuthToken({
  email: "tenant-user-manager-e2e@codexsun.app",
  userId: "tenant-user-manager-e2e",
  userType: "super_admin"
});
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
    `SELECT tenant.id, tenant.uuid, tenant.tenant_code, tenant.db_name
     FROM tenants tenant
     INNER JOIN information_schema.SCHEMATA schema_info ON schema_info.SCHEMA_NAME=tenant.db_name
     WHERE tenant.status='active'
     ORDER BY tenant.id
     LIMIT 5`
  );
  assert.ok(
    tenants.length >= 2,
    "Two active tenants with manually installed databases are required for the access isolation E2E."
  );
  const results: Array<{ tenant: string; records: number }> = [];
  for (const tenant of tenants) results.push(await exerciseTenant(tenant));

  const first = tenants[0]!;
  const second = tenants[1]!;
  const baseline = await request(first, "GET", "/tenant/access/users");
  const crossed = await request(first, "GET", "/tenant/access/users", undefined, second.db_name);
  assert.equal(
    crossed.statusCode,
    200,
    "The server did not restore tenant context from authenticated claims."
  );
  assert.deepEqual(
    crossed.data,
    baseline.data,
    "An untrusted tenant database header changed the authenticated tenant data source."
  );
  const deniedAdminAccess = await request(first, "GET", `/admin/tenants/${first.id}/users`);
  assert.equal(
    deniedAdminAccess.statusCode,
    403,
    "A tenant user was allowed to use the Super Admin tenant-user manager."
  );
  await exerciseCompanyIndustryAndMissingLogos(first);
  await exerciseSuperAdminUserManager(first);
  await exerciseUnavailableTenantUserManager();

  console.log("Tenant access multi-tenant E2E passed", { results, tenants: tenants.length });
} finally {
  await app.close();
  await closeAllTenantDatabases();
  await closePlatformDatabase();
  await connection.end();
}

async function exerciseCompanyIndustryAndMissingLogos(tenant: TenantRow) {
  const industries = await request(tenant, "GET", "/tenant/industries");
  assert.equal(industries.statusCode, 200, "Tenant industry lookup failed.");
  const industry = (industries.data as Array<{ id: number; name: string }>)[0];
  assert.ok(industry, "An active Platform industry is required for company validation E2E.");

  const companies = await request(tenant, "GET", "/core/organisation/companies");
  assert.equal(companies.statusCode, 200, "Tenant company lookup failed.");
  const company = (companies.data as Array<{
    id: number;
    industryId: number | null;
    name: string;
  }>)[0];
  assert.ok(company, "A seeded tenant company is required for company validation E2E.");

  try {
    const updated = await request(
      tenant,
      "PUT",
      `/core/organisation/companies/${company.id}`,
      { industryId: industry.id, name: company.name }
    );
    assert.equal(updated.statusCode, 200, "Company industry validation lost tenant context.");
    assert.equal(
      (updated.data as { industryName: string | null }).industryName,
      industry.name,
      "Company did not persist the Platform-owned industry name."
    );
  } finally {
    const restored = await request(
      tenant,
      "PUT",
      `/core/organisation/companies/${company.id}`,
      { industryId: company.industryId, name: company.name }
    );
    assert.equal(restored.statusCode, 200, "Company industry E2E cleanup failed.");
  }

  for (const variant of ["logo", "logo-dark"] as const) {
    const logo = await request(tenant, "GET", `/tenant/media/company-logo/${variant}`);
    assert.equal(logo.statusCode, 404, `Missing ${variant} returned a server error.`);
    assert.equal(
      logo.error?.code,
      "COMPANY_LOGO_NOT_FOUND",
      `Missing ${variant} did not return the company-logo not-found contract.`
    );
  }
}

async function exerciseUnavailableTenantUserManager() {
  await connection.changeUser({ database: env.DB_MASTER_NAME });
  const [unavailable] = await connection.query<TenantRow[]>(
    `SELECT tenant.id, tenant.uuid, tenant.tenant_code, tenant.db_name
     FROM tenants tenant
     LEFT JOIN information_schema.SCHEMATA schema_info ON schema_info.SCHEMA_NAME=tenant.db_name
     WHERE schema_info.SCHEMA_NAME IS NULL
     ORDER BY tenant.id
     LIMIT 1`
  );
  const tenant = unavailable[0];
  if (!tenant) return;
  const response = await adminRequest("GET", `/admin/tenants/${tenant.id}/users`);
  assert.equal(response.statusCode, 409, "An unavailable tenant database returned a server error.");
  assert.match(
    response.error?.message ?? "",
    /tenant database|database secret/iu,
    "The unavailable tenant response did not explain the database problem."
  );
  assert.notEqual(
    response.error?.message,
    "Something went wrong",
    "The unavailable tenant response hid the actionable database error."
  );
}

async function exerciseSuperAdminUserManager(tenant: TenantRow) {
  const path = `/admin/tenants/${tenant.id}/users`;
  let created: RecordValue | null = null;
  try {
    const createResponse = await adminRequest("POST", path, {
      email: `sa-e2e-${run}@${tenant.tenant_code.toLowerCase()}.test`,
      name: `SA E2E User ${run}`,
      password: "Cxapp-SA-E2E-123!",
      status: "active"
    });
    assert.equal(createResponse.statusCode, 200, "Super Admin tenant-user create failed.");
    created = createResponse.data as RecordValue;

    const listResponse = await adminRequest("GET", path);
    assert.equal(listResponse.statusCode, 200, "Super Admin tenant-user list failed.");
    assert.ok(
      (listResponse.data as RecordValue[]).some((record) => record.id === created?.id),
      "Created tenant user did not persist in the selected tenant database."
    );

    const updateResponse = await adminRequest("PUT", `${path}/${created.id}`, {
      email: `sa-e2e-${run}@${tenant.tenant_code.toLowerCase()}.test`,
      name: `SA E2E User Edited ${run}`,
      status: "active"
    });
    assert.equal(updateResponse.statusCode, 200, "Super Admin tenant-user update failed.");
    assert.equal(
      (updateResponse.data as RecordValue).name,
      `SA E2E User Edited ${run}`,
      "Super Admin tenant-user edit did not persist."
    );
  } finally {
    if (created) {
      const removed = await adminRequest("DELETE", `${path}/${created.id}/force`);
      assert.equal(removed.statusCode, 200, "Super Admin tenant-user cleanup failed.");
    }
  }
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
    password: "Cxapp-E2E-123!",
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
    "SELECT email, uuid FROM app_users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1"
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
  const envelope = response.json() as {
    data?: unknown;
    error?: { code?: string; message?: string };
  };
  return { data: envelope.data, error: envelope.error, statusCode: response.statusCode };
}

async function adminRequest(
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown
) {
  const response = await app.inject({
    headers: { authorization: `Bearer ${superAdminToken}` },
    method,
    ...(payload === undefined ? {} : { payload }),
    url
  });
  const envelope = response.json() as {
    data?: unknown;
    error?: { code?: string; message?: string };
  };
  return { data: envelope.data, error: envelope.error, statusCode: response.statusCode };
}
