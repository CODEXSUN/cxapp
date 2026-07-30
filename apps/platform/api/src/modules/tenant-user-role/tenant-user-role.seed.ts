import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export async function seedTenantUserRoleModule(database: Kysely<TenantDatabase>) {
  const u = await database
      .selectFrom("users")
      .select("id")
      .where("role", "=", "admin")
      .executeTakeFirst(),
    r = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", "admin")
      .executeTakeFirst();
  if (!u || !r) return;
  await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${stable(`user-role:${u.id}:${r.id}`)},${u.id},${r.id},'active',TRUE) ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(
    database
  );
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
