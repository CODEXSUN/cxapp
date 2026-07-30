import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  Pincode,
  PincodeListFilters,
  PincodeSavePayload,
  PincodeStatus,
  PincodeWithRelations
} from "./pincode.types.js";

type PincodeRow = {
  id: number;
  city_id: number;
  name: string;
  area: string;
  sort_order: number;
  status: PincodeStatus;
};

type PincodeRelationRow = PincodeRow & {
  city_name: string;
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  country_id: number;
  country_name: string;
};

export class PincodeRepository {
  async list(filters: PincodeListFilters = {}) {
    const rows =
      await sql<PincodeRow>`SELECT id, city_id, name, area, sort_order, status FROM pincodes
      WHERE (${filters.cityId ?? ""} = '' OR city_id = ${Number(filters.cityId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(area) LIKE ${like(filters.search)})
      ORDER BY sort_order, name`.execute(getCoreDatabase());
    return rows.rows.map(toPincode);
  }

  async listWithRelations(filters: PincodeListFilters = {}) {
    const rows = await sql<PincodeRelationRow>`SELECT pincodes.id, pincodes.city_id,
        cities.name city_name, cities.district_id, districts.name district_name,
        districts.state_id, states.name state_name, states.country_id, countries.name country_name,
        pincodes.name, pincodes.area, pincodes.sort_order, pincodes.status
      FROM pincodes
      INNER JOIN cities ON cities.id = pincodes.city_id
      INNER JOIN districts ON districts.id = cities.district_id
      INNER JOIN states ON states.id = districts.state_id
      INNER JOIN countries ON countries.id = states.country_id
      WHERE (${filters.cityId ?? ""} = '' OR pincodes.city_id = ${Number(filters.cityId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(pincodes.name) LIKE ${like(filters.search)} OR LOWER(pincodes.area) LIKE ${like(filters.search)}
          OR LOWER(cities.name) LIKE ${like(filters.search)} OR LOWER(districts.name) LIKE ${like(filters.search)}
          OR LOWER(states.name) LIKE ${like(filters.search)} OR LOWER(countries.name) LIKE ${like(filters.search)})
      ORDER BY pincodes.sort_order, pincodes.name`.execute(getCoreDatabase());
    return rows.rows.map(toPincodeWithRelations);
  }

  async find(id: string | number) {
    const rows =
      await sql<PincodeRow>`SELECT id, city_id, name, area, sort_order, status FROM pincodes WHERE id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? toPincode(rows.rows[0]) : null;
  }

  async findWithRelations(id: string | number) {
    const rows = await sql<PincodeRelationRow>`SELECT pincodes.id, pincodes.city_id,
        cities.name city_name, cities.district_id, districts.name district_name,
        districts.state_id, states.name state_name, states.country_id, countries.name country_name,
        pincodes.name, pincodes.area, pincodes.sort_order, pincodes.status
      FROM pincodes
      INNER JOIN cities ON cities.id = pincodes.city_id
      INNER JOIN districts ON districts.id = cities.district_id
      INNER JOIN states ON states.id = districts.state_id
      INNER JOIN countries ON countries.id = states.country_id
      WHERE pincodes.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toPincodeWithRelations(rows.rows[0]) : null;
  }

  async cityExists(cityId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM cities WHERE id=${Number(cityId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: PincodeSavePayload) {
    const result = await sql`INSERT INTO pincodes (city_id, name, area, sort_order, status) VALUES
      (${Number(input.cityId)}, ${input.name}, ${input.area}, ${input.sortOrder}, ${input.status})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: PincodeSavePayload) {
    await sql`UPDATE pincodes SET city_id=${Number(input.cityId)}, name=${input.name}, area=${input.area}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: PincodeStatus) {
    await sql`UPDATE pincodes SET status=${status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM pincodes WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function toPincode(row: PincodeRow): Pincode {
  return {
    id: Number(row.id),
    cityId: Number(row.city_id),
    name: row.name,
    area: row.area,
    sortOrder: Number(row.sort_order),
    status: row.status
  };
}

function toPincodeWithRelations(row: PincodeRelationRow): PincodeWithRelations {
  return {
    ...toPincode(row),
    cityName: row.city_name,
    districtId: Number(row.district_id),
    districtName: row.district_name,
    stateId: Number(row.state_id),
    stateName: row.state_name,
    countryId: Number(row.country_id),
    countryName: row.country_name
  };
}

function like(value?: string) {
  return `%${(value ?? "").trim().toLowerCase()}%`;
}
