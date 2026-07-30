import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  Country,
  CountryListFilters,
  CountrySavePayload,
  CountryStatus
} from "./country.types.js";

type CountryRow = {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  status: CountryStatus;
};

export class CountryRepository {
  async list(filters: CountryListFilters = {}) {
    const rows = await sql<CountryRow>`SELECT id, code, name, sort_order, status FROM countries
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(code) LIKE ${like(filters.search)})
      ORDER BY sort_order, name`.execute(getCoreDatabase());
    return rows.rows.map(toCountry);
  }

  async find(id: string | number) {
    const rows =
      await sql<CountryRow>`SELECT id, code, name, sort_order, status FROM countries WHERE id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? toCountry(rows.rows[0]) : null;
  }

  async create(input: CountrySavePayload) {
    const result = await sql`INSERT INTO countries (code, name, sort_order, status) VALUES
      (${input.code}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: CountrySavePayload) {
    await sql`UPDATE countries SET code=${input.code}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: CountryStatus) {
    await sql`UPDATE countries SET status=${status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM countries WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM states WHERE country_id=${id}`.execute(getCoreDatabase());
    return Number(rows.rows[0]?.count ?? 0);
  }
}

function toCountry(row: CountryRow): Country {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    sortOrder: Number(row.sort_order),
    status: row.status
  };
}
function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
