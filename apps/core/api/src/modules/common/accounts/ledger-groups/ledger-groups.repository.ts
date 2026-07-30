import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  LedgerGroupListFilters,
  LedgerGroupRecord,
  LedgerGroupSavePayload,
  LedgerGroupStatus
} from "./ledger-groups.types.js";
type Row = { id: number | string; name: string; status: LedgerGroupStatus };
export class LedgerGroupsRepository {
  async list(filters: LedgerGroupListFilters = {}) {
    const term = filters.search?.trim().toLowerCase() ?? "";
    const rows =
      await sql<Row>`SELECT id,name,status FROM ledger_groups WHERE (${term}='' OR LOWER(name) LIKE ${`%${term}%`}) ORDER BY name`.execute(
        getCoreDatabase()
      );
    return rows.rows.map(map);
  }
  async find(id: string | number) {
    const rows =
      await sql<Row>`SELECT id,name,status FROM ledger_groups WHERE id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? map(rows.rows[0]) : null;
  }
  async findByName(name: string) {
    const rows =
      await sql<Row>`SELECT id,name,status FROM ledger_groups WHERE LOWER(name)=${name.trim().toLowerCase()} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? map(rows.rows[0]) : null;
  }
  async create(input: LedgerGroupSavePayload) {
    const result =
      await sql`INSERT INTO ledger_groups (name,status) VALUES (${input.name},${input.status})`.execute(
        getCoreDatabase()
      );
    return (await this.find(Number(result.insertId)))!;
  }
  async update(id: string | number, input: LedgerGroupSavePayload) {
    await sql`UPDATE ledger_groups SET name=${input.name},status=${input.status},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async setStatus(id: string | number, status: LedgerGroupStatus) {
    await sql`UPDATE ledger_groups SET status=${status},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) AS count FROM ledgers WHERE ledger_group_id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return Number(rows.rows[0]?.count ?? 0);
  }
  async forceDelete(id: string | number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM ledger_groups WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return record;
  }
}
function map(row: Row): LedgerGroupRecord {
  return { id: Number(row.id), name: row.name, status: row.status };
}
