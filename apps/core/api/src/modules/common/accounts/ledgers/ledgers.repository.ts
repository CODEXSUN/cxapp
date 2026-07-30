import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  LedgerListFilters,
  LedgerRecord,
  LedgerSavePayload,
  LedgerStatus
} from "./ledgers.types.js";
type Row = {
  id: number | string;
  ledger_group_id: number | string;
  ledger_group_name: string;
  name: string;
  status: LedgerStatus;
};
export class LedgersRepository {
  async list(filters: LedgerListFilters = {}) {
    const term = filters.search?.trim().toLowerCase() ?? "";
    const rows =
      await sql<Row>`SELECT l.id,l.ledger_group_id,g.name AS ledger_group_name,l.name,l.status FROM ledgers l INNER JOIN ledger_groups g ON g.id=l.ledger_group_id WHERE (${term}='' OR LOWER(l.name) LIKE ${`%${term}%`} OR LOWER(g.name) LIKE ${`%${term}%`}) ORDER BY g.name,l.name`.execute(
        getCoreDatabase()
      );
    return rows.rows.map(map);
  }
  async find(id: string | number) {
    const rows =
      await sql<Row>`SELECT l.id,l.ledger_group_id,g.name AS ledger_group_name,l.name,l.status FROM ledgers l INNER JOIN ledger_groups g ON g.id=l.ledger_group_id WHERE l.id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? map(rows.rows[0]) : null;
  }
  async findGroup(id: number) {
    const rows = await sql<{
      id: number | string;
      name: string;
      status: LedgerStatus;
    }>`SELECT id,name,status FROM ledger_groups WHERE id=${id} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0]
      ? { id: Number(rows.rows[0].id), name: rows.rows[0].name, status: rows.rows[0].status }
      : null;
  }
  async findByName(groupId: number, name: string) {
    const rows =
      await sql<Row>`SELECT l.id,l.ledger_group_id,g.name AS ledger_group_name,l.name,l.status FROM ledgers l INNER JOIN ledger_groups g ON g.id=l.ledger_group_id WHERE l.ledger_group_id=${groupId} AND LOWER(l.name)=${name.trim().toLowerCase()} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? map(rows.rows[0]) : null;
  }
  async create(input: LedgerSavePayload) {
    const result =
      await sql`INSERT INTO ledgers (ledger_group_id,name,status) VALUES (${input.ledgerGroupId},${input.name},${input.status})`.execute(
        getCoreDatabase()
      );
    return (await this.find(Number(result.insertId)))!;
  }
  async update(id: string | number, input: LedgerSavePayload) {
    await sql`UPDATE ledgers SET ledger_group_id=${input.ledgerGroupId},name=${input.name},status=${input.status},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async setStatus(id: string | number, status: LedgerStatus) {
    await sql`UPDATE ledgers SET status=${status},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async forceDelete(id: string | number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM ledgers WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return record;
  }
}
function map(row: Row): LedgerRecord {
  return {
    id: Number(row.id),
    ledgerGroupId: Number(row.ledger_group_id),
    ledgerGroupName: row.ledger_group_name,
    name: row.name,
    status: row.status
  };
}
