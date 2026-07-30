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
      await sql<StateRow>`SELECT core_states.id, core_states.country_id, core_countries.name country_name,
        core_states.code, core_states.name, core_states.sort_order, core_states.status
      FROM core_states
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE (${filters.countryId ?? ""} = '' OR core_states.country_id = ${Number(filters.countryId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(core_states.code) LIKE ${like(filters.search)} OR LOWER(core_states.name) LIKE ${like(filters.search)} OR LOWER(core_countries.name) LIKE ${like(filters.search)})
      ORDER BY core_states.sort_order, core_states.name`.execute(getCoreDatabase());
    return rows.rows.map(toState);
  }

  async find(id: string | number) {
    const rows =
      await sql<StateRow>`SELECT core_states.id, core_states.country_id, core_countries.name country_name,
        core_states.code, core_states.name, core_states.sort_order, core_states.status
      FROM core_states
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE core_states.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toState(rows.rows[0]) : null;
  }

  async countryExists(countryId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM core_countries WHERE id=${Number(countryId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: StateSavePayload) {
    const result = await sql`INSERT INTO core_states (country_id, code, name, sort_order, status) VALUES
      (${Number(input.countryId)}, ${input.code}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: StateSavePayload) {
    await sql`UPDATE core_states SET country_id=${Number(input.countryId)}, code=${input.code}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: StateStatus) {
    await sql`UPDATE core_states SET status=${status} WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM core_states WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM core_districts WHERE state_id=${Number(id)}`.execute(
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
