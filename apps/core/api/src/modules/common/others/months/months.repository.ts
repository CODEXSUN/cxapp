import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type { MonthsListFilters, MonthsRecord, MonthsSavePayload } from "./months.types.js";

type MonthsRow = {
  id: number;
  name: string;
  start_date: Date | string;
  end_date: Date | string;
  status: string;
  sort_order: number;
};

export class MonthsRepository {
  async list(filters: MonthsListFilters = {}) {
    const rows =
      await sql<MonthsRow>`SELECT id, name, start_date, end_date, status, sort_order FROM months
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toMonths);
  }

  async find(id: string | number) {
    const rows =
      await sql<MonthsRow>`SELECT id, name, start_date, end_date, status, sort_order FROM months
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toMonths(rows.rows[0]) : null;
  }

  async create(input: MonthsSavePayload) {
    const result =
      await sql`INSERT INTO months (name, start_date, end_date, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${normalizeString(input.startDate)}, ${normalizeString(input.endDate)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
        getCoreDatabase()
      );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: MonthsSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE months SET name=${normalizeString(input.name)}, start_date=${normalizeString(input.startDate)}, end_date=${normalizeString(input.endDate)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE months SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM months WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: MonthsRecord) {
  if (
    String(record.name ?? "").trim() === "-" ||
    String(record.startDate ?? "").trim() === "-" ||
    String(record.endDate ?? "").trim() === "-"
  )
    return false;
  return true;
}

function toMonths(row: MonthsRow): MonthsRecord {
  return {
    id: Number(row.id),
    name: row.name,
    startDate: dateOnly(row.start_date),
    endDate: dateOnly(row.end_date),
    isActive: row.status === "active",
    sortOrder: Number(row.sort_order)
  };
}

function dateOnly(value: Date | string) {
  const serialized = value instanceof Date ? value.toISOString() : String(value);
  return serialized.slice(0, 10);
}

function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
