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
      await sql<PincodeRow>`SELECT id, city_id, name, area, sort_order, status FROM core_pincodes
      WHERE (${filters.cityId ?? ""} = '' OR city_id = ${Number(filters.cityId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(area) LIKE ${like(filters.search)})
      ORDER BY sort_order, name`.execute(getCoreDatabase());
    return rows.rows.map(toPincode);
  }

  async listWithRelations(filters: PincodeListFilters = {}) {
    const rows = await sql<PincodeRelationRow>`SELECT core_pincodes.id, core_pincodes.city_id,
        core_cities.name city_name, core_cities.district_id, core_districts.name district_name,
        core_districts.state_id, core_states.name state_name, core_states.country_id, core_countries.name country_name,
        core_pincodes.name, core_pincodes.area, core_pincodes.sort_order, core_pincodes.status
      FROM core_pincodes
      INNER JOIN core_cities ON core_cities.id = core_pincodes.city_id
      INNER JOIN core_districts ON core_districts.id = core_cities.district_id
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE (${filters.cityId ?? ""} = '' OR core_pincodes.city_id = ${Number(filters.cityId ?? 0)})
        AND (${filters.search ?? ""} = '' OR LOWER(core_pincodes.name) LIKE ${like(filters.search)} OR LOWER(core_pincodes.area) LIKE ${like(filters.search)}
          OR LOWER(core_cities.name) LIKE ${like(filters.search)} OR LOWER(core_districts.name) LIKE ${like(filters.search)}
          OR LOWER(core_states.name) LIKE ${like(filters.search)} OR LOWER(core_countries.name) LIKE ${like(filters.search)})
      ORDER BY core_pincodes.sort_order, core_pincodes.name`.execute(getCoreDatabase());
    return rows.rows.map(toPincodeWithRelations);
  }

  async find(id: string | number) {
    const rows =
      await sql<PincodeRow>`SELECT id, city_id, name, area, sort_order, status FROM core_pincodes WHERE id=${Number(id)} LIMIT 1`.execute(
        getCoreDatabase()
      );
    return rows.rows[0] ? toPincode(rows.rows[0]) : null;
  }

  async findWithRelations(id: string | number) {
    const rows = await sql<PincodeRelationRow>`SELECT core_pincodes.id, core_pincodes.city_id,
        core_cities.name city_name, core_cities.district_id, core_districts.name district_name,
        core_districts.state_id, core_states.name state_name, core_states.country_id, core_countries.name country_name,
        core_pincodes.name, core_pincodes.area, core_pincodes.sort_order, core_pincodes.status
      FROM core_pincodes
      INNER JOIN core_cities ON core_cities.id = core_pincodes.city_id
      INNER JOIN core_districts ON core_districts.id = core_cities.district_id
      INNER JOIN core_states ON core_states.id = core_districts.state_id
      INNER JOIN core_countries ON core_countries.id = core_states.country_id
      WHERE core_pincodes.id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toPincodeWithRelations(rows.rows[0]) : null;
  }

  async cityExists(cityId: string | number) {
    const rows = await sql<{
      id: number;
    }>`SELECT id FROM core_cities WHERE id=${Number(cityId)} LIMIT 1`.execute(getCoreDatabase());
    return Boolean(rows.rows[0]);
  }

  async create(input: PincodeSavePayload) {
    const result =
      await sql`INSERT INTO core_pincodes (city_id, name, area, sort_order, status) VALUES
      (${Number(input.cityId)}, ${input.name}, ${input.area}, ${input.sortOrder}, ${input.status})`.execute(
        getCoreDatabase()
      );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: PincodeSavePayload) {
    await sql`UPDATE core_pincodes SET city_id=${Number(input.cityId)}, name=${input.name}, area=${input.area}, sort_order=${input.sortOrder}, status=${input.status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setStatus(id: string | number, status: PincodeStatus) {
    await sql`UPDATE core_pincodes SET status=${status} WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing) return null;
    await sql`DELETE FROM core_pincodes WHERE id=${Number(id)}`.execute(getCoreDatabase());
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
