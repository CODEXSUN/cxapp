import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "./schema.js";

const retiredDevkitTables = [
  "devkit_planning_reactions",
  "devkit_planning_comments",
  "devkit_planning_board_links",
  "devkit_planning_boards",
  "devkit_project_manager_attachments",
  "devkit_project_manager_items",
  "devkit_task_manager_activity",
  "devkit_task_manager_lookups",
  "devkit_task_manager_todos",
  "devkit_sync_conflicts",
  "devkit_sync_runs",
  "devkit_sync_snapshots",
  "devkit_sync_connections",
  "devkit_sync_tokens",
  "project_manager_attachments",
  "project_manager_items",
  "devkit_users"
] as const;

export const retiredDevkitCleanupMigration = {
  description: "Remove database tables owned by retired DevKit features.",
  key: "devkit.retired-feature-cleanup.sql.v1"
} as const;

export async function removeRetiredDevkitTables(database: Kysely<DevkitDatabase>) {
  for (const table of retiredDevkitTables) {
    await sql.raw(`DROP TABLE IF EXISTS \`${table}\``).execute(database);
  }
}
