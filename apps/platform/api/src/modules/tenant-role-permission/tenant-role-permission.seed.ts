import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export async function seedTenantRolePermissionModule(database: Kysely<TenantDatabase>) {
  const role = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", "admin")
    .executeTakeFirst();
  if (!role) return;
  const permissions = await database.selectFrom("permissions").select("id").execute();
  for (const p of permissions)
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected) VALUES (${stable(`role-permission:${role.id}:${p.id}`)},${role.id},${p.id},'active',TRUE) ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(
      database
    );
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
