import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  SalesTypesListFilters,
  SalesTypesRecord,
  SalesTypesSavePayload
} from "./sales-types.types.js";

type SalesTypesRow = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  sort_order: number;
};

export class SalesTypesRepository {
  async list(filters: SalesTypesListFilters = {}) {
    const rows =
      await sql<SalesTypesRow>`SELECT id, name, description, status, sort_order FROM sales_types
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(description) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toSalesTypes);
  }

  async find(id: string | number) {
    const rows =
      await sql<SalesTypesRow>`SELECT id, name, description, status, sort_order FROM sales_types
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toSalesTypes(rows.rows[0]) : null;
  }

  async create(input: SalesTypesSavePayload) {
    const result = await sql`INSERT INTO sales_types (name, description, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${normalizeString(input.description)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: SalesTypesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE sales_types SET name=${normalizeString(input.name)}, description=${normalizeString(input.description)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE sales_types SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM sales_types WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: SalesTypesRecord) {
  if (String(record.name ?? "").trim() === "-" || String(record.description ?? "").trim() === "-")
    return false;
  return true;
}

function toSalesTypes(row: SalesTypesRow): SalesTypesRecord {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
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
