import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function migrateQueueManagerModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("queue_runtime_settings")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("singleton_key", "integer", (column) => column.notNull().unique())
    .addColumn("backend", "varchar(24)", (column) => column.notNull())
    .addColumn("updated_by", "varchar(190)", (column) => column.notNull())
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
  await db.schema
    .createTable("queue_jobs")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("queue_name", "varchar(80)", (column) => column.notNull())
    .addColumn("job_name", "varchar(160)", (column) => column.notNull())
    .addColumn("source_module", "varchar(160)", (column) => column.notNull())
    .addColumn("tenant_id", "varchar(80)")
    .addColumn("correlation_id", "varchar(120)")
    .addColumn("idempotency_key", "varchar(180)")
    .addColumn("actor_email", "varchar(180)")
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("pending"))
    .addColumn("priority", "integer", (column) => column.notNull().defaultTo(100))
    .addColumn("attempts", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (column) => column.notNull().defaultTo(3))
    .addColumn("payload_json", "json", (column) => column.notNull())
    .addColumn("result_json", "json", (column) => column.notNull())
    .addColumn("error_message", "text")
    .addColumn("available_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("started_at", "datetime")
    .addColumn("completed_at", "datetime")
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createIndex("queue_jobs_status_idx")
    .ifNotExists()
    .on("queue_jobs")
    .column("status")
    .execute();
  await db.schema
    .createIndex("queue_jobs_queue_status_idx")
    .ifNotExists()
    .on("queue_jobs")
    .columns(["queue_name", "status"])
    .execute();
}
