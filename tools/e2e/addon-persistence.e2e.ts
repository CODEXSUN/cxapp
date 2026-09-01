import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";

process.loadEnvFile(".env");

const run = `${Date.now().toString(36)}${process.pid.toString(36)}`.slice(-12);
const blogDatabaseName = databaseName(`cxapp_blog_e2e_${run}`);
const fileManagerDatabaseName = databaseName(`cxapp_file_e2e_${run}`);
const localRoot = await mkdtemp(join(tmpdir(), "cxapp-file-manager-e2e-"));
const databaseConfig = {
  host: requiredEnv("DB_HOST"),
  password: requiredEnv("DB_PASSWORD"),
  port: Number(requiredEnv("DB_PORT")),
  user: requiredEnv("DB_USER")
};
const admin = await createConnection(databaseConfig);
let blogDatabase: Kysely<Record<string, unknown>> | null = null;
let closeFileManagerDatabase: (() => Promise<void>) | null = null;

try {
  await createDatabase(blogDatabaseName);
  await createDatabase(fileManagerDatabaseName);
  blogDatabase = new Kysely({
    dialect: new MysqlDialect({
      pool: createPool({ ...databaseConfig, database: blogDatabaseName })
    })
  });

  const blog = await import("@codexsun/blog/api");
  const { rollbackMigrationBatch, runMigrationBatch } = await import("@cxapp/framework/db");
  const firstBlogMigration = await blog.migrateBlogsDatabase(
    blogDatabase as never,
    runMigrationBatch
  );
  const secondBlogMigration = await blog.migrateBlogsDatabase(
    blogDatabase as never,
    runMigrationBatch
  );
  assert.equal(firstBlogMigration.applied.length, blog.blogsMigrationBatch.steps.length);
  assert.equal(secondBlogMigration.skipped.length, blog.blogsMigrationBatch.steps.length);

  const context = {
    actorId: "system:addon-persistence-e2e",
    database: blogDatabase as never,
    host: "cxapp" as const,
    origin: "https://addon-persistence.test",
    scopeId: `e2e-${run}`
  };
  await blog.seedBlogsDatabase(context);
  const firstArticleCount = await countRows(blogDatabase, "blogs_articles");
  await blog.seedBlogsDatabase(context);
  assert.equal(await countRows(blogDatabase, "blogs_articles"), firstArticleCount);
  assert.ok(firstArticleCount > 0, "Blog owner seeds produced no articles.");
  await assert.rejects(
    rollbackMigrationBatch(blogDatabase, blog.blogsMigrationBatch as never),
    /has no safe rollback/iu
  );

  configureFileManager(fileManagerDatabaseName, localRoot);
  const fileManager = await import("@codexsun/file-manager/api");
  closeFileManagerDatabase = fileManager.closeFileManagerDatabase;
  await fileManager.runFileManagerMigrations(fileManager.fileManagerMigrations);
  await fileManager.runFileManagerMigrations(fileManager.fileManagerMigrations);
  assert.equal(
    await countLedgerRows(fileManagerDatabaseName, "applied"),
    fileManager.fileManagerMigrations.length
  );
  const rollback = await fileManager.rollbackFileManagerMigrations(
    fileManager.fileManagerMigrations
  );
  assert.equal(rollback.rolledBack.length, fileManager.fileManagerMigrations.length);
  await fileManager.runFileManagerMigrations(fileManager.fileManagerMigrations);
  assert.equal(
    await countLedgerRows(fileManagerDatabaseName, "applied"),
    fileManager.fileManagerMigrations.length
  );

  console.log("Add-on live migration E2E passed", {
    blogArticles: firstArticleCount,
    blogSteps: blog.blogsMigrationBatch.steps.length,
    fileManagerSteps: fileManager.fileManagerMigrations.length
  });
} finally {
  await closeFileManagerDatabase?.();
  await blogDatabase?.destroy();
  await dropDatabase(fileManagerDatabaseName);
  await dropDatabase(blogDatabaseName);
  await admin.end();
  await rm(localRoot, { force: true, recursive: true });
}

async function countRows(database: Kysely<Record<string, unknown>>, table: string) {
  const result = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) AS count FROM ${sql.table(table)}`.execute(database);
  return Number(result.rows[0]?.count ?? 0);
}

async function countLedgerRows(database: string, status: string) {
  const [rows] = await admin.query<Array<{ count: number | string }>>(
    `SELECT COUNT(*) AS count FROM \`${database}\`.migration_schema WHERE scope='file-manager' AND status=?`,
    [status]
  );
  return Number(rows[0]?.count ?? 0);
}

async function createDatabase(name: string) {
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

async function dropDatabase(name: string) {
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
}

function configureFileManager(database: string, root: string) {
  process.env.FILE_MANAGER_DB_HOST = databaseConfig.host;
  process.env.FILE_MANAGER_DB_NAME = database;
  process.env.FILE_MANAGER_DB_PASSWORD = databaseConfig.password;
  process.env.FILE_MANAGER_DB_PORT = String(databaseConfig.port);
  process.env.FILE_MANAGER_DB_USER = databaseConfig.user;
  process.env.FILE_MANAGER_LOCAL_ROOT = root;
}

function databaseName(value: string) {
  if (!/^cxapp_(?:blog|file)_e2e_[a-z0-9]+$/u.test(value)) {
    throw new Error(`Unsafe temporary database name: ${value}`);
  }
  return value;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for add-on persistence E2E.`);
  return value;
}
