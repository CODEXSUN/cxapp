import { sql, type Kysely } from "kysely";
import type { BillingDatabase } from "../../database/billing-database.js";

export const billingRuntimePersistenceMigration = {
  description: "Durable Billing domain events and asynchronous outbox jobs.",
  key: "billing.runtime-persistence.database-v1"
} as const;

export async function migrateBillingRuntimePersistence(db: Kysely<BillingDatabase>) {
  await db.schema
    .createTable("billing_domain_events")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("event_name", "varchar(160)", (column) => column.notNull())
    .addColumn("event_version", "integer", (column) => column.notNull().defaultTo(1))
    .addColumn("source_module", "varchar(160)", (column) => column.notNull())
    .addColumn("correlation_id", "varchar(160)")
    .addColumn("request_id", "varchar(160)")
    .addColumn("actor_email", "varchar(191)")
    .addColumn("actor_id", "varchar(80)")
    .addColumn("payload_json", "json", (column) => column.notNull())
    .addColumn("occurred_at", "datetime", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("published"))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:event-publisher")
    )
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();
  await db.schema
    .createIndex("billing_domain_events_name_occurred_idx")
    .ifNotExists()
    .on("billing_domain_events")
    .columns(["event_name", "occurred_at"])
    .execute();

  await db.schema
    .createTable("billing_outbox_jobs")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("queue_name", "varchar(80)", (column) => column.notNull())
    .addColumn("job_name", "varchar(160)", (column) => column.notNull())
    .addColumn("source_module", "varchar(160)", (column) => column.notNull())
    .addColumn("correlation_id", "varchar(160)")
    .addColumn("request_id", "varchar(160)")
    .addColumn("idempotency_key", "varchar(191)")
    .addColumn("payload_json", "json", (column) => column.notNull())
    .addColumn("attempts", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("max_attempts", "integer", (column) => column.notNull().defaultTo(3))
    .addColumn("available_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("pending"))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:queue-adapter")
    )
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addUniqueConstraint("billing_outbox_jobs_idempotency_uq", ["idempotency_key"])
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();
  await db.schema
    .createIndex("billing_outbox_jobs_status_available_idx")
    .ifNotExists()
    .on("billing_outbox_jobs")
    .columns(["status", "available_at"])
    .execute();
}
