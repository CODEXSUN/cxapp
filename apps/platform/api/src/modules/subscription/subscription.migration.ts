import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export async function migrateSubscriptionModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("app_subscriptions")
    .ifNotExists()
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (c) => c.notNull().unique())
    .addColumn("tenant_id", "integer", (c) => c.notNull())
    .addColumn("plan_id", "integer", (c) => c.notNull())
    .addColumn("billing_cycle", "varchar(16)", (c) => c.notNull())
    .addColumn("starts_on", "varchar(10)", (c) => c.notNull())
    .addColumn("ends_on", "varchar(10)")
    .addColumn("status", "varchar(24)", (c) => c.notNull())
    .addColumn("created_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addForeignKeyConstraint(
      "app_subscriptions_tenant_fk",
      ["tenant_id"],
      "app_tenants",
      ["id"],
      (constraint) => constraint.onDelete("cascade")
    )
    .addForeignKeyConstraint(
      "app_subscriptions_plan_fk",
      ["plan_id"],
      "app_plans",
      ["id"],
      (constraint) => constraint.onDelete("restrict")
    )
    .execute();
}
