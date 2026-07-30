import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  AddressTypesListFilters,
  AddressTypesRecord,
  AddressTypesSavePayload
} from "./address-types.types.js";

type AddressTypesRow = {
  id: number;
  name: string;
  status: string;
  sort_order: number;
};

export class AddressTypesRepository {
  async list(filters: AddressTypesListFilters = {}) {
    const rows = await sql<AddressTypesRow>`SELECT id, name, status, sort_order FROM address_types
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toAddressTypes);
  }

  async find(id: string | number) {
    const rows = await sql<AddressTypesRow>`SELECT id, name, status, sort_order FROM address_types
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toAddressTypes(rows.rows[0]) : null;
  }

  async create(input: AddressTypesSavePayload) {
    const result = await sql`INSERT INTO address_types (name, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: AddressTypesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE address_types SET name=${normalizeString(input.name)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE address_types SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM address_types WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: AddressTypesRecord) {
  if (String(record.name ?? "").trim() === "-") return false;
  return true;
}

function toAddressTypes(row: AddressTypesRow): AddressTypesRecord {
  return {
    id: Number(row.id),
    name: row.name,
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
