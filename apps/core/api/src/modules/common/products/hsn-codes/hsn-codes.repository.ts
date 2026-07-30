import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  HsnCodesListFilters,
  HsnCodesRecord,
  HsnCodesSavePayload
} from "./hsn-codes.types.js";

type HsnCodesRow = {
  id: number;
  code: string;
  description: string;
  status: string;
  sort_order: number;
};

export class HsnCodesRepository {
  async list(filters: HsnCodesListFilters = {}) {
    const rows =
      await sql<HsnCodesRow>`SELECT id, code, description, status, sort_order FROM hsn_codes
      WHERE (${filters.search ?? ""} = '' OR LOWER(code) LIKE ${like(filters.search)} OR LOWER(description) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toHsnCodes);
  }

  async find(id: string | number) {
    const rows =
      await sql<HsnCodesRow>`SELECT id, code, description, status, sort_order FROM hsn_codes
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toHsnCodes(rows.rows[0]) : null;
  }

  async create(input: HsnCodesSavePayload) {
    const result = await sql`INSERT INTO hsn_codes (code, description, status, sort_order) VALUES
      (${normalizeString(input.code)}, ${normalizeString(input.description)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: HsnCodesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE hsn_codes SET code=${normalizeString(input.code)}, description=${normalizeString(input.description)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE hsn_codes SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM hsn_codes WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: HsnCodesRecord) {
  if (String(record.code ?? "").trim() === "-" || String(record.description ?? "").trim() === "-")
    return false;
  return true;
}

function toHsnCodes(row: HsnCodesRow): HsnCodesRecord {
  return {
    id: Number(row.id),
    code: row.code,
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
