import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
import type {
  WorkOrderListFilters,
  WorkOrderRecord,
  WorkOrderSaveInput,
  WorkOrderStatus
} from "./work-order.types.js";
type Row = {
  id: number | string;
  uuid: string;
  code: string;
  name: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};
export class WorkOrderRepository {
  async list(filters: WorkOrderListFilters = {}) {
    const search = filters.search?.trim().toLowerCase() ?? "";
    const result =
      await sql<Row>`SELECT * FROM work_orders WHERE deleted_at IS NULL AND (${search}='' OR LOWER(code) LIKE ${`%${search}%`} OR LOWER(name) LIKE ${`%${search}%`}) ORDER BY code, id`.execute(
        getCoreDatabase()
      );
    return result.rows.map(toRecord);
  }
  async find(id: string | number) {
    const result =
      await sql<Row>`SELECT * FROM work_orders WHERE id=${Number(id)} AND deleted_at IS NULL LIMIT 1`.execute(
        getCoreDatabase()
      );
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }
  async create(input: WorkOrderSaveInput) {
    const value = normalize(input);
    const result =
      await sql`INSERT INTO work_orders (uuid, code, name, status) VALUES (${randomBytes(4).toString("hex")}, ${value.code}, ${value.name}, ${value.status})`.execute(
        getCoreDatabase()
      );
    return (await this.find(Number(result.insertId)))!;
  }
  async update(id: string | number, input: WorkOrderSaveInput) {
    const current = await this.find(id);
    if (!current || current.name === "-") return null;
    const value = normalize(input, current);
    await sql`UPDATE work_orders SET code=${value.code}, name=${value.name}, status=${value.status}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)} AND deleted_at IS NULL`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async setActive(id: string | number, active: boolean) {
    const current = await this.find(id);
    if (!current || current.name === "-") return null;
    await sql`UPDATE work_orders SET status=${active ? "active" : "suspend"}, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)} AND deleted_at IS NULL`.execute(
      getCoreDatabase()
    );
    return this.find(id);
  }
  async forceDelete(id: string | number) {
    const current = await this.find(id);
    if (!current || current.name === "-") return null;
    await sql`UPDATE work_orders SET status='deleted', deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=${Number(id)} AND deleted_at IS NULL`.execute(
      getCoreDatabase()
    );
    return current;
  }
}
function normalize(input: WorkOrderSaveInput, current?: WorkOrderRecord) {
  const code = String(input.code ?? current?.code ?? "").trim();
  const name = String(input.name ?? current?.name ?? "").trim();
  if (!code) throw new Error("Work order code is required.");
  if (!name) throw new Error("Work order name is required.");
  return {
    code,
    name,
    status: (input.status ??
      (input.isActive === false ? "inactive" : current?.status) ??
      "active") as WorkOrderStatus
  };
}
function toRecord(row: Row): WorkOrderRecord {
  return {
    id: Number(row.id),
    uuid: row.uuid,
    code: row.code,
    name: row.name,
    status: row.status as WorkOrderStatus,
    isActive: row.status === "active",
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
    deletedAt: row.deleted_at ? date(row.deleted_at) : null
  };
}
function date(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
