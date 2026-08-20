import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type { City, CityListFilters, CitySavePayload, CityStatus } from "./city.types.js";

type CityRow = {
  id: number;
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  country_id: number;
  country_name: string;
  name: string;
  sort_order: number;
  status: CityStatus;
};

export class CityRepository {
  async list(filters: CityListFilters = {}) {
    const rows = await sql<CityRow>`SELECT core_cities.id, core_cities.district_id,
        core_districts.name district_name, core_districts.state_id, core_states.name state_name,
        core_states.country_id, core_countries.name country_name, core_cities.name, core_cities.sort_order, core_cities.status
      FROM core_cities
      INNER JOIN core_districts ON core_districts.id = core_cities.district_id
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE (${filters.districtId ?? ""} = '' OR core_cities.district_id = ${Number(filters.districtId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(core_cities.name) LIKE ${like(filters.search)}
          OR LOWER(core_districts.name) LIKE ${like(filters.search)} OR LOWER(core_states.name) LIKE ${like(filters.search)}
          OR LOWER(core_countries.name) LIKE ${like(filters.search)})
      ORDER BY core_cities.sort_order, core_cities.name`.execute(getCoreDatabase());
    return rows.rows.map(toCity);
  }

  async find(id: string | number) {
    const rows = await sql<CityRow>`SELECT core_cities.id, core_cities.district_id,
        core_districts.name district_name, core_districts.state_id, core_states.name state_name,
        core_states.country_id, core_countries.name country_name, core_cities.name, core_cities.sort_order, core_cities.status
      FROM core_cities
      INNER JOIN core_districts ON core_districts.id = core_cities.district_id
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE core_cities.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toCity(rows.rows[0]) : null;
  }

  async districtExists(districtId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM core_districts WHERE id=${Number(districtId)} LIMIT 1`.execute(
      getCoreDatabase()
    );
    return Boolean(rows.rows[0]);
  }

  async create(input: CitySavePayload) {
    const result = await sql`INSERT INTO core_cities (district_id, name, sort_order, status) VALUES
      (${Number(input.districtId)}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: CitySavePayload) {
    await sql`UPDATE core_cities SET district_id=${Number(input.districtId)}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: CityStatus) {
    await sql`UPDATE core_cities SET status=${status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM core_cities WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM core_pincodes WHERE city_id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return Number(rows.rows[0]?.count ?? 0);
  }
}

function toCity(row: CityRow): City {
  return {
    id: Number(row.id),
    districtId: Number(row.district_id),
    districtName: row.district_name,
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
