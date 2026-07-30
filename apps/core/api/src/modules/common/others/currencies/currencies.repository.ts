import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  CurrenciesListFilters,
  CurrenciesRecord,
  CurrenciesSavePayload
} from "./currencies.types.js";

type CurrenciesRow = {
  id: number;
  name: string;
  symbol: string;
  status: string;
  sort_order: number;
};

export class CurrenciesRepository {
  async list(filters: CurrenciesListFilters = {}) {
    const rows =
      await sql<CurrenciesRow>`SELECT id, name, symbol, status, sort_order FROM currencies
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(symbol) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toCurrencies);
  }

  async find(id: string | number) {
    const rows =
      await sql<CurrenciesRow>`SELECT id, name, symbol, status, sort_order FROM currencies
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toCurrencies(rows.rows[0]) : null;
  }

  async create(input: CurrenciesSavePayload) {
    const result = await sql`INSERT INTO currencies (name, symbol, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${normalizeString(input.symbol)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: CurrenciesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE currencies SET name=${normalizeString(input.name)}, symbol=${normalizeString(input.symbol)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE currencies SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM currencies WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: CurrenciesRecord) {
  if (String(record.name ?? "").trim() === "-" || String(record.symbol ?? "").trim() === "-")
    return false;
  return true;
}

function toCurrencies(row: CurrenciesRow): CurrenciesRecord {
  return {
    id: Number(row.id),
    name: row.name,
    symbol: row.symbol,
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

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
