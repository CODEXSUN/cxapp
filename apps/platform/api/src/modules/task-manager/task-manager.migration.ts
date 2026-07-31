import { sql, type Kysely } from "kysely";
import type { TaskManagerLookupsTable, TaskManagerTodosTable } from "../../database/schema.js";

export type TaskManagerDatabase = {
  task_manager_lookups: TaskManagerLookupsTable;
  task_manager_todos: TaskManagerTodosTable;
};

export const taskManagerMigration = {
  key: "platform.task-manager.database-v1",
  description: "Database-backed tenant and Super Admin tasks and lookup values."
};

export async function migrateTaskManagerModule<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await db.schema
    .createTable("task_manager_todos")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("scope_key", "varchar(80)", (column) => column.notNull().defaultTo("super-admin"))
    .addColumn("title", "varchar(255)", (column) => column.notNull())
    .addColumn("description", "text", (column) => column.notNull())
    .addColumn("category", "varchar(80)", (column) => column.notNull().defaultTo("work"))
    .addColumn("group_name", "varchar(120)", (column) => column.notNull().defaultTo(""))
    .addColumn("status", "varchar(40)", (column) => column.notNull().defaultTo("open"))
    .addColumn("priority", "varchar(40)", (column) => column.notNull().defaultTo("medium"))
    .addColumn("due_date", "varchar(32)", (column) => column.notNull().defaultTo(""))
    .addColumn("position", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:migration")
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
    .createIndex("task_manager_todos_scope_position_idx")
    .ifNotExists()
    .on("task_manager_todos")
    .columns(["scope_key", "position"])
    .execute();
  await db.schema
    .createIndex("task_manager_todos_scope_status_idx")
    .ifNotExists()
    .on("task_manager_todos")
    .columns(["scope_key", "status"])
    .execute();

  await db.schema
    .createTable("task_manager_lookups")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("scope_key", "varchar(80)", (column) => column.notNull().defaultTo("super-admin"))
    .addColumn("kind", "varchar(24)", (column) => column.notNull())
    .addColumn("name", "varchar(120)", (column) => column.notNull())
    .addColumn("value", "varchar(120)", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:migration")
    )
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addUniqueConstraint("task_manager_lookups_scope_kind_name_uq", ["scope_key", "kind", "name"])
    .addUniqueConstraint("task_manager_lookups_scope_kind_value_uq", ["scope_key", "kind", "value"])
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();
}

export async function rollbackTaskManagerModule<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await db.schema.dropTable("task_manager_lookups").ifExists().execute();
  await db.schema.dropTable("task_manager_todos").ifExists().execute();
}
