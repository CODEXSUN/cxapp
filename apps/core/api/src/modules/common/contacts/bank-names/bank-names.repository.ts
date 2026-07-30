import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  BankNamesListFilters,
  BankNamesRecord,
  BankNamesSavePayload
} from "./bank-names.types.js";

type BankNamesRow = {
  id: number;
  name: string;
  status: string;
  sort_order: number;
};

export class BankNamesRepository {
  async list(filters: BankNamesListFilters = {}) {
    const rows = await sql<BankNamesRow>`SELECT id, name, status, sort_order FROM bank_names
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toBankNames);
  }

  async find(id: string | number) {
    const rows = await sql<BankNamesRow>`SELECT id, name, status, sort_order FROM bank_names
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toBankNames(rows.rows[0]) : null;
  }

  async create(input: BankNamesSavePayload) {
    const result = await sql`INSERT INTO bank_names (name, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: BankNamesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE bank_names SET name=${normalizeString(input.name)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE bank_names SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM bank_names WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: BankNamesRecord) {
  if (String(record.name ?? "").trim() === "-") return false;
  return true;
}

function toBankNames(row: BankNamesRow): BankNamesRecord {
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
