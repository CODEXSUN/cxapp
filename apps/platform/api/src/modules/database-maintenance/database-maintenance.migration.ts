import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function migrateDatabaseMaintenanceModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("app_database_maintenance_runs")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("database_scope", "varchar(24)", (column) => column.notNull())
    .addColumn("target_key", "varchar(160)", (column) => column.notNull())
    .addColumn("database_name", "varchar(160)", (column) => column.notNull())
    .addColumn("operation", "varchar(24)", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull())
    .addColumn("details_json", "json", (column) => column.notNull())
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("completed_at", "datetime")
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addColumn("updated_at", "datetime", (col) =>
      col
        .notNull()
        .defaultTo(sql`CURRENT_TIMESTAMP`)
        .modifyEnd(sql`ON UPDATE CURRENT_TIMESTAMP`)
    )
    .execute();

  await reconcileLegacyDuplicateRuns(db);
}

async function reconcileLegacyDuplicateRuns(db: Kysely<PlatformDatabase>) {
  const runningRows = await db
    .selectFrom("app_database_maintenance_runs")
    .select(["id", "created_at", "database_name", "database_scope", "operation", "target_key"])
    .where("status", "=", "running")
    .execute();

  for (const running of runningRows) {
    const terminal = await db
      .selectFrom("app_database_maintenance_runs")
      .select(["id", "completed_at", "created_at", "status"])
      .where("id", ">", Number(running.id))
      .where("created_at", "=", running.created_at)
      .where("database_name", "=", running.database_name)
      .where("database_scope", "=", running.database_scope)
      .where("operation", "=", running.operation)
      .where("target_key", "=", running.target_key)
      .where("status", "in", ["completed", "failed"])
      .orderBy("id", "asc")
      .executeTakeFirst();

    if (!terminal) continue;
    await db
      .updateTable("app_database_maintenance_runs")
      .set({
        completed_at: terminal.completed_at ?? terminal.created_at,
        status: terminal.status
      })
      .where("id", "=", Number(running.id))
      .execute();
  }

  await removeExactTerminalDuplicates(db);
}

async function removeExactTerminalDuplicates(db: Kysely<PlatformDatabase>) {
  const rows = await db
    .selectFrom("app_database_maintenance_runs")
    .select([
      "id",
      "created_at",
      "database_name",
      "database_scope",
      "details_json",
      "operation",
      "status",
      "target_key"
    ])
    .where("operation", "in", ["migrate", "reinstall", "setup"])
    .where("status", "in", ["completed", "failed"])
    .orderBy("id", "desc")
    .execute();
  const retained = new Set<string>();

  for (const row of rows) {
    const signature = JSON.stringify([
      row.database_scope,
      row.target_key,
      row.database_name,
      row.operation,
      row.status,
      new Date(row.created_at).toISOString(),
      row.details_json
    ]);
    if (!retained.has(signature)) {
      retained.add(signature);
      continue;
    }
    await db.deleteFrom("app_database_maintenance_runs").where("id", "=", Number(row.id)).execute();
  }
}
