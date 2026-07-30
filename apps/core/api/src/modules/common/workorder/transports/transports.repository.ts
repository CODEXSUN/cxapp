import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import type {
  TransportsListFilters,
  TransportsRecord,
  TransportsSavePayload
} from "./transports.types.js";

type TransportsRow = {
  id: number;
  name: string;
  gst: string | null;
  vehicle_no: string | null;
  address: string | null;
  contact_no: string | null;
  contact_person: string | null;
  status: string;
  sort_order: number;
};

export class TransportsRepository {
  async list(filters: TransportsListFilters = {}) {
    const rows =
      await sql<TransportsRow>`SELECT id, name, gst, vehicle_no, address, contact_no, contact_person, status, sort_order FROM transports
      WHERE (${filters.search ?? ""} = '' OR LOWER(name) LIKE ${like(filters.search)} OR LOWER(gst) LIKE ${like(filters.search)} OR LOWER(vehicle_no) LIKE ${like(filters.search)} OR LOWER(address) LIKE ${like(filters.search)} OR LOWER(contact_no) LIKE ${like(filters.search)} OR LOWER(contact_person) LIKE ${like(filters.search)})
      ORDER BY sort_order, id`.execute(getCoreDatabase());
    return rows.rows.map(toTransports);
  }

  async find(id: string | number) {
    const rows =
      await sql<TransportsRow>`SELECT id, name, gst, vehicle_no, address, contact_no, contact_person, status, sort_order FROM transports
      WHERE id=${Number(id)} LIMIT 1`.execute(getCoreDatabase());
    return rows.rows[0] ? toTransports(rows.rows[0]) : null;
  }

  async create(input: TransportsSavePayload) {
    const result =
      await sql`INSERT INTO transports (name, gst, vehicle_no, address, contact_no, contact_person, status, sort_order) VALUES
      (${normalizeString(input.name)}, ${normalizeString(input.gst)}, ${normalizeString(input.vehicleNo)}, ${normalizeString(input.address)}, ${normalizeString(input.contactNo)}, ${normalizeString(input.contactPerson)}, ${input.isActive === false ? "inactive" : "active"}, ${numberValue(input.sortOrder, 1000)})`.execute(
        getCoreDatabase()
      );
    return (await this.find(String(result.insertId)))!;
  }

  async update(id: string | number, input: TransportsSavePayload) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE transports SET name=${normalizeString(input.name)}, gst=${normalizeString(input.gst)}, vehicle_no=${normalizeString(input.vehicleNo)}, address=${normalizeString(input.address)}, contact_no=${normalizeString(input.contactNo)}, contact_person=${normalizeString(input.contactPerson)}, status=${input.isActive === false ? "inactive" : "active"},
      sort_order=${numberValue(input.sortOrder, 1000)}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async setActive(id: string | number, isActive: boolean) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`UPDATE transports SET status=${isActive ? "active" : "inactive"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)}`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }

  async forceDelete(id: string | number) {
    const existing = await this.find(id);
    if (!existing || !canMutate(existing)) return null;
    await sql`DELETE FROM transports WHERE id=${Number(id)}`.execute(getCoreDatabase());
    return existing;
  }
}

function canMutate(record: TransportsRecord) {
  if (
    String(record.name ?? "").trim() === "-" ||
    String(record.gst ?? "").trim() === "-" ||
    String(record.vehicleNo ?? "").trim() === "-" ||
    String(record.address ?? "").trim() === "-" ||
    String(record.contactNo ?? "").trim() === "-" ||
    String(record.contactPerson ?? "").trim() === "-"
  )
    return false;
  return true;
}

function toTransports(row: TransportsRow): TransportsRecord {
  return {
    id: Number(row.id),
    name: row.name,
    gst: row.gst,
    vehicleNo: row.vehicle_no,
    address: row.address,
    contactNo: row.contact_no,
    contactPerson: row.contact_person,
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
