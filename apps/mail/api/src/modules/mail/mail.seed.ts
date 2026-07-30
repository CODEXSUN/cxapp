import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";

export async function seedMailModule(database: Kysely<Record<string, Record<string, unknown>>>) {
  const key = "mail.manage";
  await sql`
    INSERT INTO permissions (uuid, \`key\`, label, description, status, is_protected)
    VALUES (${stable(key)}, ${key}, 'Mail manage', 'Allows tenant mail settings, inbox, compose, and delivery.', 'active', TRUE)
    ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), status='active', is_protected=TRUE
  `.execute(database);
  await sql`
    INSERT INTO role_permissions (uuid, role_id, permission_id, status, is_protected)
    SELECT ${stable(`role-permission:admin:${key}`)}, role.id, permission.id, 'active', TRUE
    FROM roles role INNER JOIN permissions permission ON permission.\`key\`=${key}
    WHERE role.\`key\`='admin'
    ON DUPLICATE KEY UPDATE status='active', is_protected=TRUE
  `.execute(database);
  return { seeded: 1 };
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
