import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  TenantUserRole,
  TenantUserRoleListFilters,
  TenantUserRoleSavePayload,
  TenantUserRoleStatus
} from "./tenant-user-role.types.js";
type Row = {
  id: number;
  is_protected: boolean | number;
  role_id: number;
  role_key: string;
  role_label: string;
  status: TenantUserRoleStatus;
  user_email: string;
  user_id: number;
  user_name: string;
  uuid: string;
};
export class TenantUserRoleRepository {
  constructor(private database: Kysely<TenantDatabase>) {}
  async list(f: TenantUserRoleListFilters = {}) {
    const term = `%${(f.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE (${f.search ?? ""}='' OR LOWER(u.name) LIKE ${term} OR LOWER(u.email) LIKE ${term} OR LOWER(r.label) LIKE ${term}) ORDER BY u.name,r.label`.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE ur.id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async parents(v: TenantUserRoleSavePayload) {
    const r = await sql<{
      role_count: number | string;
      user_count: number | string;
    }>`SELECT (SELECT COUNT(*) FROM users WHERE id=${v.userId} AND status='active') user_count,(SELECT COUNT(*) FROM roles WHERE id=${v.roleId} AND status='active') role_count`.execute(
      this.database
    );
    return {
      role: Boolean(Number(r.rows[0]?.role_count ?? 0)),
      user: Boolean(Number(r.rows[0]?.user_count ?? 0))
    };
  }
  async create(v: TenantUserRoleSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${uuid},${v.userId},${v.roleId},${v.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async update(id: number, v: TenantUserRoleSavePayload) {
    await sql`UPDATE user_roles SET user_id=${v.userId},role_id=${v.roleId},status=${v.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: TenantUserRoleStatus) {
    await sql`UPDATE user_roles SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async forceDelete(id: number) {
    const r = await this.find(id);
    if (!r) return null;
    await sql`DELETE FROM user_roles WHERE id=${id}`.execute(this.database);
    return r;
  }
}
function map(r: Row): TenantUserRole {
  return {
    id: Number(r.id),
    isProtected: Boolean(r.is_protected),
    roleId: Number(r.role_id),
    roleKey: r.role_key,
    roleLabel: r.role_label,
    status: r.status,
    userEmail: r.user_email,
    userId: Number(r.user_id),
    userName: r.user_name,
    uuid: r.uuid
  };
}
