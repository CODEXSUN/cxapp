import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  PrioritiesListFilters,
  PrioritiesRecord,
  PrioritiesSavePayload
} from "./priorities.types.js";

type PrioritiesRow = {
  id: number;
  name: string;
  colour: string;
  tag: string;
  status: string;
  sort_order: number;
};

export class PrioritiesRepository {
  async list(filters: PrioritiesListFilters = {}) {
    const rows =
      await sql<PrioritiesRow>`SELECT id, name, colour, tag, status, sort_order FROM priorities
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(colour) LIKE ${like(filters.search)} OR LOWER(tag) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toPriorities);
  }

  async find(id: string | number) {
    const rows =
      await sql<PrioritiesRow>`SELECT id, name, colour, tag, status, sort_order FROM priorities
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toPriorities(rows.rows[0]) : null;
  }

  async create(input: PrioritiesSavePayload) {
    const result = await sql`INSERT INTO priorities (name, colour, tag, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${normalizeString(input.colour)}, ${normalizeString(input.tag)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
      getCoreDatabase()
    );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: PrioritiesSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE priorities SET name=${normalizeString(input.name)}, colour=${normalizeString(input.colour)}, tag=${normalizeString(input.tag)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE priorities SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM priorities WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: PrioritiesRecord) {
  if (
    String(record.name ?? "").trim() === "-" ||
    String(record.colour ?? "").trim() === "-" ||
    String(record.tag ?? "").trim() === "-"
  )
    return false;
  return true;
}

function toPriorities(row: PrioritiesRow): PrioritiesRecord {
  return {
    id: Number(row.id),
    name: row.name,
    colour: row.colour,
    tag: row.tag,
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
