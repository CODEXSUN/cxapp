import assert from "node:assert/strict";
import Fastify from "fastify";
import { createConnection } from "mysql2/promise";

process.loadEnvFile(".env");

const run = `${Date.now().toString(36)}${process.pid.toString(36)}`.slice(-12);
const tenants = [`fm-a-${run}`, `fm-b-${run}`];
const objects = new Map<string, Buffer>();
const fileManager = await import("@codexsun/file-manager/api");
const app = Fastify();

await fileManager.registerFileManagerApi(app, {
  providers: [
    {
      descriptor: {
        fields: [],
        key: "test_memory",
        label: "E2E memory provider",
        supportsUpload: true
      },
      deleteObject: async (_connection, key) => {
        objects.delete(key);
      },
      getObject: async (_connection, key) => {
        const body = objects.get(key);
        if (!body) throw new Error("E2E object was not found.");
        return body;
      },
      putObject: async (_connection, key, body) => {
        objects.set(key, body);
        return { providerKey: key, publicUrl: null };
      },
      test: async () => undefined
    }
  ],
  resolveContext: async (request) => {
    const authorization = request.headers.authorization;
    const tenantId = authorization === "Bearer tenant-a" ? tenants[0] : tenants[1];
    if (!authorization || !["Bearer tenant-a", "Bearer tenant-b"].includes(authorization)) {
      throw Object.assign(new Error("Authentication is required."), { statusCode: 401 });
    }
    return { actorId: `actor:${tenantId}`, host: "cxapp", tenantId };
  }
});

try {
  await app.ready();
  assert.equal(
    (await app.inject({ method: "GET", url: "/file-manager/providers" })).statusCode,
    401
  );

  const providers = await request("tenant-a", "GET", "/file-manager/providers");
  for (const key of [
    "local",
    "external_url",
    "s3",
    "cloudflare_r2",
    "google_drive",
    "test_memory"
  ]) {
    assert.ok(providers.json().some((provider: { key: string }) => provider.key === key));
  }

  const connection = await request("tenant-a", "POST", "/file-manager/connections", {
    config: {},
    credentials: {},
    isDefault: false,
    name: `Memory ${run}`,
    provider: "test_memory",
    status: "active"
  });
  assert.equal(connection.statusCode, 201, connection.body);
  const connectionUuid = connection.json().uuid as string;
  const folderA = await createFolder("tenant-a");
  const folderB = await createFolder("tenant-b");
  assert.notEqual(folderA, folderB);

  const content = Buffer.from(`tenant-a-content-${run}`);
  const uploaded = await upload("tenant-a", connectionUuid, folderA, content);
  assert.equal(uploaded.statusCode, 201, uploaded.body);
  const file = uploaded.json() as { uuid: string };

  const tenantAFiles = await request(
    "tenant-a",
    "GET",
    `/file-manager/files?folderUuid=${folderA}`
  );
  assert.ok(tenantAFiles.json().some((item: { uuid: string }) => item.uuid === file.uuid));
  const tenantBFiles = await request(
    "tenant-b",
    "GET",
    `/file-manager/files?folderUuid=${folderB}`
  );
  assert.ok(!tenantBFiles.json().some((item: { uuid: string }) => item.uuid === file.uuid));

  const crossed = await request("tenant-b", "GET", `/file-manager/files/${file.uuid}/content`);
  assert.notEqual(crossed.statusCode, 200, "A second tenant read another tenant's file.");
  const read = await request("tenant-a", "GET", `/file-manager/files/${file.uuid}/content`);
  assert.deepEqual(read.rawPayload, content);
  const download = await request("tenant-a", "GET", `/file-manager/files/${file.uuid}/download`);
  assert.match(String(download.headers["content-disposition"]), /^attachment;/u);

  const linked = await request("tenant-a", "POST", "/file-manager/files/link", {
    connectionUuid,
    folderUuid: folderA,
    mimeType: "text/html",
    name: `reference-${run}.html`,
    url: "https://example.com/reference"
  });
  assert.equal(linked.statusCode, 201, linked.body);
  const redirect = await request(
    "tenant-a",
    "GET",
    `/file-manager/files/${linked.json().uuid}/content`
  );
  assert.equal(redirect.statusCode, 302);

  await request("tenant-a", "DELETE", `/file-manager/files/${file.uuid}`);
  await request("tenant-a", "DELETE", `/file-manager/files/${linked.json().uuid}`);
  console.log("File Manager host, provider, URL, and tenant-isolation E2E passed");
} finally {
  await app.close();
  await fileManager.closeFileManagerDatabase();
  await cleanupTenantRows();
}

async function createFolder(tenant: "tenant-a" | "tenant-b") {
  const response = await request(tenant, "POST", "/file-manager/folders", {
    name: `Folder ${run}`,
    parentUuid: null
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().uuid as string;
}

function request(tenant: "tenant-a" | "tenant-b", method: string, url: string, payload?: unknown) {
  return app.inject({
    headers: { authorization: `Bearer ${tenant}` },
    method,
    ...(payload === undefined ? {} : { payload }),
    url
  });
}

function upload(tenant: "tenant-a", connectionUuid: string, folderUuid: string, body: Buffer) {
  const boundary = `cxapp-${run}`;
  const payload = Buffer.concat([
    field(boundary, "connectionUuid", connectionUuid),
    field(boundary, "folderUuid", folderUuid),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="proof.txt"\r\nContent-Type: text/plain\r\n\r\n`
    ),
    body,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  return app.inject({
    headers: {
      authorization: `Bearer ${tenant}`,
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    method: "POST",
    payload,
    url: "/file-manager/files/upload"
  });
}

function field(boundary: string, name: string, value: string) {
  return Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  );
}

async function cleanupTenantRows() {
  const connection = await createConnection({
    database: requiredEnv("FILE_MANAGER_DB_NAME"),
    host: requiredEnv("FILE_MANAGER_DB_HOST"),
    password: requiredEnv("FILE_MANAGER_DB_PASSWORD"),
    port: Number(requiredEnv("FILE_MANAGER_DB_PORT")),
    user: requiredEnv("FILE_MANAGER_DB_USER")
  });
  try {
    for (const table of ["fm_files", "fm_folders", "fm_storage_connections"]) {
      await connection.query(
        `DELETE FROM ${table} WHERE host_key='cxapp' AND tenant_id IN (?, ?)`,
        tenants
      );
    }
  } finally {
    await connection.end();
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for File Manager E2E.`);
  return value;
}
