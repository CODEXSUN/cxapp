import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { env } from "../../apps/platform/api/src/env.js";
import {
  assertDatabaseName,
  quoteIdentifier
} from "../../apps/platform/api/src/database/database-utils.js";

const masterDatabase = assertDatabaseName(env.DB_MASTER_NAME, "master database name");
const tenantDatabase = assertDatabaseName(
  env.DEFAULT_TENANT_DB_NAME,
  "default tenant database name"
);
const connection = await createConnection({
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});

try {
  for (const database of [masterDatabase, tenantDatabase]) {
    const [tables] = await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'devkit\\_%'`,
      [database]
    );
    assert.equal(tables.length, 4, `${database} is not registry-only.`);

    const [migrations] = await connection.query<RowDataPacket[]>(
      `SELECT name, status
       FROM ${quoteIdentifier(database)}.migration_schema
       WHERE scope = 'devkit' AND status = 'applied'`
    );
    assert.ok(
      migrations.some((migration) => migration.name === "devkit.platform-registry.sql.v1"),
      `${database} does not contain the Platform Registry migration.`
    );

    const [nonstandard] = await connection.query<RowDataPacket[]>(
      `SELECT tables.TABLE_NAME
       FROM information_schema.TABLES AS tables
       LEFT JOIN information_schema.COLUMNS AS columns
         ON columns.TABLE_SCHEMA = tables.TABLE_SCHEMA
        AND columns.TABLE_NAME = tables.TABLE_NAME
        AND columns.COLUMN_NAME IN
          ('id', 'uuid', 'status', 'created_by', 'created_at', 'updated_at')
       WHERE tables.TABLE_SCHEMA = ?
         AND tables.TABLE_NAME LIKE 'devkit\\_%'
       GROUP BY tables.TABLE_NAME
       HAVING COUNT(columns.COLUMN_NAME) != 6`,
      [database]
    );
    assert.deepEqual(
      nonstandard,
      [],
      `${database} contains DevKit tables without standard identity or audit columns.`
    );
  }

  const probeKey = `cxapp-isolation-${Date.now()}`;
  const probeUuid = randomBytes(4).toString("hex");
  await connection.beginTransaction();
  try {
    await connection.query(
      `INSERT INTO ${quoteIdentifier(masterDatabase)}.devkit_platform_registry_platforms
         (uuid, platform_key, name, description)
       VALUES (?, ?, 'Isolation probe', 'Rolled back verification record')`,
      [probeUuid, probeKey]
    );
    const [masterRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM ${quoteIdentifier(masterDatabase)}.devkit_platform_registry_platforms
       WHERE platform_key = ?`,
      [probeKey]
    );
    const [tenantRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM ${quoteIdentifier(tenantDatabase)}.devkit_platform_registry_platforms
       WHERE platform_key = ?`,
      [probeKey]
    );
    assert.equal(Number(masterRows[0]?.count ?? 0), 1);
    assert.equal(
      Number(tenantRows[0]?.count ?? 0),
      0,
      "A master DevKit record leaked into the tenant database."
    );
  } finally {
    await connection.rollback();
  }

  console.log("DevKit master/tenant isolation E2E passed", {
    masterDatabase,
    tenantDatabase
  });
} finally {
  await connection.end();
}
