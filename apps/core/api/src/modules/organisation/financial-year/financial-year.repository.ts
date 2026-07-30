import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
import type {
  FinancialYearListFilters,
  FinancialYearRecord,
  FinancialYearSavePayload
} from "./financial-year.types.js";

type Row = {
  id: number | string;
  uuid: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number | boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export class FinancialYearRepository {
  async list(filters: FinancialYearListFilters = {}) {
    const term = filters.search?.trim().toLowerCase() ?? "";
    const rows =
      await sql<Row>`SELECT id,uuid,name,DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,is_current,status,created_at,updated_at FROM financial_years WHERE (${term}='' OR LOWER(name) LIKE ${`%${term}%`} OR LOWER(status) LIKE ${`%${term}%`}) ORDER BY start_date DESC,id DESC`.execute(
        getCoreDatabase()
      );
    return rows.rows.map(mapRow);
  }

  async find(id: string | number) {
    const rows =
      await sql<Row>`SELECT id,uuid,name,DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,is_current,status,created_at,updated_at FROM financial_years WHERE id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? mapRow(rows.rows[0]) : null;
  }

  async current() {
    const rows =
      await sql<Row>`SELECT id,uuid,name,DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,is_current,status,created_at,updated_at FROM financial_years WHERE is_current=1 LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? mapRow(rows.rows[0]) : null;
  }

  async create(input: FinancialYearSavePayload) {
    const database = getCoreDatabase();
    let insertedId = 0;
    await database.transaction().execute(async (transaction) => {
      if (input.isCurrent) await sql`UPDATE financial_years SET is_current=0`.execute(transaction);
      const result =
        await sql`INSERT INTO financial_years (uuid,name,start_date,end_date,is_current,status) VALUES (${randomUUID()},${input.name.trim()},${input.startDate},${input.endDate},${input.isCurrent ? 1 : 0},${input.status ?? "active"})`.execute(
          transaction
        );
      insertedId = Number(result.insertId);
    });
    return (await this.find(insertedId))!;
  }

  async update(id: string | number, input: FinancialYearSavePayload) {
    if (!(await this.find(id))) return null;
    const database = getCoreDatabase();
    await database.transaction().execute(async (transaction) => {
      if (input.isCurrent) await sql`UPDATE financial_years SET is_current=0`.execute(transaction);
      await sql`UPDATE financial_years SET name=${input.name.trim()},start_date=${input.startDate},end_date=${input.endDate},is_current=${input.isCurrent ? 1 : 0},status=${input.status ?? "active"},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
        transaction
      );
    });
    return this.find(id);
  }

  async setCurrent(id: string | number) {
    if (!(await this.find(id))) return null;
    const database = getCoreDatabase();
    await database.transaction().execute(async (transaction) => {
      await sql`UPDATE financial_years SET is_current=0`.execute(transaction);
      await sql`UPDATE financial_years SET is_current=1,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
        transaction
      );
    });
    return this.find(id);
  }

  async setActive(id: string | number, active: boolean) {
    if (!(await this.find(id))) return null;
    await sql`UPDATE financial_years SET status=${active ? "active" : "inactive"},updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async isDefault(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) AS count FROM default_company_settings WHERE financial_year_id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return Number(rows.rows[0]?.count ?? 0) > 0;
  }

  async forceDelete(id: string | number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM financial_years WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return record;
  }
}

function mapRow(row: Row): FinancialYearRecord {
  return {
    id: Number(row.id),
    uuid: row.uuid,
    name: row.name,
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    isCurrent: Boolean(row.is_current),
    status: row.status === "active" ? "active" : "inactive",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
