import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type { TaxesListFilters, TaxesRecord, TaxesSavePayload } from "./taxes.types.js";

type TaxesRow = {
  id: number;
  rate_percent: number;
  description: string;
  status: string;
  sort_order: number;
};

export class TaxesRepository {
  async list(filters: TaxesListFilters = {}) {
    const rows =
      await sql<TaxesRow>`SELECT id, rate_percent, description, status, sort_order FROM taxes
      WHERE (${filters.search ?? ""} = '' OR LOWER(description) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toTaxes);
  }

  async find(id: string | number) {
    const rows =
      await sql<TaxesRow>`SELECT id, rate_percent, description, status, sort_order FROM taxes
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toTaxes(rows.rows[0]) : null;
  }

  async create(input: TaxesSavePayload) {
    const result =
      await sql`INSERT INTO taxes (rate_percent, description, status, sort_order) VALUES
      (${normalizeNumber(input.ratePercent)}, ${normalizeString(input.description)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
        getCoreDatabase()
      );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: TaxesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE taxes SET rate_percent=${normalizeNumber(input.ratePercent)}, description=${normalizeString(input.description)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE taxes SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM taxes WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: TaxesRecord) {
  if (
    String(record.ratePercent ?? "").trim() === "-" ||
    String(record.description ?? "").trim() === "-"
  )
    return false;
  return true;
}

function toTaxes(row: TaxesRow): TaxesRecord {
  return {
    id: Number(row.id),
    ratePercent: Number(row.rate_percent),
    description: row.description,
    isActive: row.status === "active",
    sortOrder: Number(row.sort_order)
  };
}

function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeNumber(value: unknown) {
  return numberValue(value, 0);
}

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
