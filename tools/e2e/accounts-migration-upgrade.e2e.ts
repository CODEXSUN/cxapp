import assert from "node:assert/strict";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";
import { closeCoreDatabase, bootstrapCoreDatabase } from "@cxapp/core-api";
import { runMigrationBatch, type MigrationBatch } from "@cxapp/framework/db";
import {
  accountsMigrationBatch,
  type AccountsDatabase
} from "../../apps/accounts/api/src/database/accounts-database.js";
import { env } from "../../apps/accounts/api/src/env.js";

const databaseName = `cxapp_accounts_upgrade_e2e_${Date.now()}`;
const admin = await createConnection({
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});
let database: Kysely<AccountsDatabase> | null = null;

try {
  await bootstrapCoreDatabase(databaseName);
  database = new Kysely<AccountsDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        database: databaseName,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        user: env.DB_USER
      })
    })
  });

  const previousBatch: MigrationBatch<AccountsDatabase> = {
    ...accountsMigrationBatch,
    steps: accountsMigrationBatch.steps.slice(0, -1)
  };
  const previousRun = await runMigrationBatch(database, previousBatch, { batchSize: 5 });
  assert.equal(previousRun.applied.length, previousBatch.steps.length);
  await assertStatusColumnAbsent("acc_core_ledger_links");
  await assertStatusColumnAbsent("acc_cash_entry_lines");

  const upgradeRun = await runMigrationBatch(database, accountsMigrationBatch, { batchSize: 5 });
  assert.deepEqual(upgradeRun.applied, ["accounts.supplemental-standard-columns-v2"]);
  assert.equal(upgradeRun.skipped.length, previousBatch.steps.length);
  await assertStandardColumnsPresent("acc_core_ledger_links");
  await assertStandardColumnsPresent("acc_cash_entry_lines");

  console.log("Accounts migration upgrade E2E passed", {
    databaseName,
    newSteps: upgradeRun.applied,
    preservedSteps: upgradeRun.skipped.length
  });
} finally {
  await database?.destroy();
  await closeCoreDatabase();
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await admin.end();
}

async function assertStatusColumnAbsent(tableName: string) {
  const columns = await standardColumns(tableName);
  assert.deepEqual(columns, ["created_at", "updated_at", "uuid"]);
}

async function assertStandardColumnsPresent(tableName: string) {
  const columns = await standardColumns(tableName);
  assert.deepEqual(columns, ["created_at", "status", "updated_at", "uuid"]);
}

async function standardColumns(tableName: string) {
  const [rows] = await admin.query<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema=? AND table_name=?
       AND column_name IN ('uuid','status','created_at','updated_at')
     ORDER BY column_name`,
    [databaseName, tableName]
  );
  return rows.map((row) => row.column_name);
}
