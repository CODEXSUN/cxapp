import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  District,
  DistrictListFilters,
  DistrictSavePayload,
  DistrictStatus
} from "./district.types.js";

type DistrictRow = {
  id: number;
  state_id: number;
  state_name: string;
  country_id: number;
  country_name: string;
  name: string;
  sort_order: number;
  status: DistrictStatus;
};

export class DistrictRepository {
  async list(filters: DistrictListFilters = {}) {
    const rows = await sql<DistrictRow>`SELECT core_districts.id, core_districts.state_id,
        core_states.name state_name, core_states.country_id, core_countries.name country_name,
        core_districts.name, core_districts.sort_order, core_districts.status
      FROM core_districts
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE (${filters.stateId ?? ""} = '' OR core_districts.state_id = ${Number(filters.stateId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(core_districts.name) LIKE ${like(filters.search)}
          OR LOWER(core_states.name) LIKE ${like(filters.search)} OR LOWER(core_countries.name) LIKE ${like(filters.search)})
      ORDER BY core_districts.sort_order, core_districts.name`.execute(getCoreDatabase());
    return rows.rows.map(toDistrict);
  }

  async find(id: string | number) {
    const rows = await sql<DistrictRow>`SELECT core_districts.id, core_districts.state_id,
        core_states.name state_name, core_states.country_id, core_countries.name country_name,
        core_districts.name, core_districts.sort_order, core_districts.status
      FROM core_districts
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE core_districts.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toDistrict(rows.rows[0]) : null;
  }

  async stateExists(stateId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM core_states WHERE id=${Number(stateId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: DistrictSavePayload) {
    const result = await sql`INSERT INTO core_districts (state_id, name, sort_order, status) VALUES
      (${Number(input.stateId)}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: DistrictSavePayload) {
    await sql`UPDATE core_districts SET state_id=${Number(input.stateId)}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: DistrictStatus) {
    await sql`UPDATE core_districts SET status=${status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM core_districts WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM core_cities WHERE district_id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return Number(rows.rows[0]?.count ?? 0);
  }
}

function toDistrict(row: DistrictRow): District {
  return {
    id: Number(row.id),
    stateId: Number(row.state_id),
    stateName: row.state_name,
    countryId: Number(row.country_id),
    countryName: row.country_name,
    name: row.name,
    sortOrder: Number(row.sort_order),
    status: row.status
  };
}

function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
