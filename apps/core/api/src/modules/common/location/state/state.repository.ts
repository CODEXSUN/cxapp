import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type { State, StateListFilters, StateSavePayload, StateStatus } from "./state.types.js";

type StateRow = {
  id: number;
  country_id: number;
  country_name: string;
  code: string;
  name: string;
  sort_order: number;
  status: StateStatus;
};
export class StateRepository {
  async list(filters: StateListFilters = {}) {
    const rows =
      await sql<StateRow>`SELECT states.id, states.country_id, countries.name country_name,
        states.code, states.name, states.sort_order, states.status
      FROM states
      INNER JOIN countries ON countries.id = states.country_id
      WHERE (${filters.countryId ?? ""} = '' OR states.country_id = ${Number(filters.countryId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(states.code) LIKE ${like(filters.search)} OR LOWER(states.name) LIKE ${like(filters.search)} OR LOWER(countries.name) LIKE ${like(filters.search)})
      ORDER BY states.sort_order, states.name`.execute(getCoreDatabase());
    return rows.rows.map(toState);
  }

  async find(id: string | number) {
    const rows =
      await sql<StateRow>`SELECT states.id, states.country_id, countries.name country_name,
        states.code, states.name, states.sort_order, states.status
      FROM states
      INNER JOIN countries ON countries.id = states.country_id
      WHERE states.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toState(rows.rows[0]) : null;
  }

  async countryExists(countryId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM countries WHERE id=${Number(countryId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: StateSavePayload) {
    const result = await sql`INSERT INTO states (country_id, code, name, sort_order, status) VALUES
      (${Number(input.countryId)}, ${input.code}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: StateSavePayload) {
    await sql`UPDATE states SET country_id=${Number(input.countryId)}, code=${input.code}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: StateStatus) {
    await sql`UPDATE states SET status=${status} WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM states WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM districts WHERE state_id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return Number(rows.rows[0]?.count ?? 0);
  }
}

function toState(row: StateRow): State {
  return {
    id: Number(row.id),
    countryId: Number(row.country_id),
    countryName: row.country_name,
    code: row.code,
    name: row.name,
    sortOrder: Number(row.sort_order),
    status: row.status
  };
}

function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
