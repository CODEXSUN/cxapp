import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";

const permissions = [
  "core.application.records.view",
  "core.application.records.create",
  "core.application.records.update",
  "core.application.records.delete",
  "core.application.records.lifecycle"
] as const;

export async function seedCoreTenantPermissions(database: Kysely<unknown>) {
  const available = await sql<{ table_count: string | number }>`
    SELECT COUNT(*) AS table_count FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN ('permissions','roles','role_permissions')
  `.execute(database);
  if (Number(available.rows[0]?.table_count ?? 0) !== 3) return;
  for (const key of permissions) {
    const label = key.split(".").join(" · ");
    await sql`
      INSERT INTO permissions (uuid, \`key\`, label, description, status, is_protected)
      VALUES (${stable(key)}, ${key}, ${label}, ${`Allows ${label.toLowerCase()} in Core.`}, 'active', TRUE)
      ON DUPLICATE KEY UPDATE
        label=VALUES(label), description=VALUES(description), status='active', is_protected=TRUE
    `.execute(database);
    await sql`
      INSERT INTO role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${stable(`role-permission:admin:${key}`)}, role.id, permission.id, 'active', TRUE
      FROM roles role
      INNER JOIN permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`='admin'
      ON DUPLICATE KEY UPDATE status='active', is_protected=TRUE
    `.execute(database);
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
