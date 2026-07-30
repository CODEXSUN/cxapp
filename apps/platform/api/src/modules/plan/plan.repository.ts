import { randomBytes } from "node:crypto";
import type { Selectable } from "kysely";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { PlansTable } from "../../database/schema.js";
import type { Plan, PlanSavePayload } from "./plan.types.js";
export class PlanRepository {
  async list() {
    return (
      await getPlatformDatabase().selectFrom("plans").selectAll().orderBy("name").execute()
    ).map(toPlan);
  }
  async create(input: PlanSavePayload) {
    const result = await getPlatformDatabase()
      .insertInto("plans")
      .values({ ...toRow(input), uuid: randomBytes(4).toString("hex") })
      .executeTakeFirst();
    return {
      ...input,
      id: Number(result.insertId),
      uuid: await this.uuid(Number(result.insertId))
    };
  }
  async update(id: number, input: PlanSavePayload) {
    const result = await getPlatformDatabase()
      .updateTable("plans")
      .set(toRow(input))
      .where("id", "=", id)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) ? this.find(id) : null;
  }
  async find(id: number) {
    const row = await getPlatformDatabase()
      .selectFrom("plans")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toPlan(row) : null;
  }
  private async uuid(id: number) {
    return (await this.find(id))?.uuid ?? "";
  }
}
function toRow(input: PlanSavePayload, uuid?: string) {
  return {
    annual_price: input.annualPrice,
    code: input.code.trim().toLowerCase(),
    description: input.description.trim(),
    limits_json: JSON.stringify(input.limits),
    monthly_price: input.monthlyPrice,
    name: input.name.trim(),
    status: input.status,
    ...(uuid ? { uuid } : {})
  };
}
function toPlan(row: Selectable<PlansTable>): Plan {
  return {
    annualPrice: Number(row.annual_price),
    code: row.code,
    description: row.description,
    id: Number(row.id),
    limits: typeof row.limits_json === "string" ? JSON.parse(row.limits_json) : row.limits_json,
    monthlyPrice: Number(row.monthly_price),
    name: row.name,
    status: row.status,
    uuid: row.uuid
  };
}
