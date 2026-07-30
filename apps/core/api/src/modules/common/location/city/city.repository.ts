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
    const rows = await sql<CityRow>`SELECT cities.id, cities.district_id,
        districts.name district_name, districts.state_id, states.name state_name,
        states.country_id, countries.name country_name, cities.name, cities.sort_order, cities.status
      FROM cities
      INNER JOIN districts ON districts.id = cities.district_id
      INNER JOIN states ON states.id = districts.state_id
      INNER JOIN countries ON countries.id = states.country_id
      WHERE (${filters.districtId ?? ""} = '' OR cities.district_id = ${Number(filters.districtId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(cities.name) LIKE ${like(filters.search)}
          OR LOWER(districts.name) LIKE ${like(filters.search)} OR LOWER(states.name) LIKE ${like(filters.search)}
          OR LOWER(countries.name) LIKE ${like(filters.search)})
      ORDER BY cities.sort_order, cities.name`.execute(getCoreDatabase());
    return rows.rows.map(toCity);
  }

  async find(id: string | number) {
    const rows = await sql<CityRow>`SELECT cities.id, cities.district_id,
        districts.name district_name, districts.state_id, states.name state_name,
        states.country_id, countries.name country_name, cities.name, cities.sort_order, cities.status
      FROM cities
      INNER JOIN districts ON districts.id = cities.district_id
      INNER JOIN states ON states.id = districts.state_id
      INNER JOIN countries ON countries.id = states.country_id
      WHERE cities.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toCity(rows.rows[0]) : null;
  }

  async districtExists(districtId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM districts WHERE id=${Number(districtId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: CitySavePayload) {
    const result = await sql`INSERT INTO cities (district_id, name, sort_order, status) VALUES
      (${Number(input.districtId)}, ${input.name}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: CitySavePayload) {
    await sql`UPDATE cities SET district_id=${Number(input.districtId)}, name=${input.name}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: CityStatus) {
    await sql`UPDATE cities SET status=${status} WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM cities WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }

  async dependentCount(id: string | number) {
    const rows = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM pincodes WHERE city_id=${Number(id)}`.execute(getCoreDatabase());
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
