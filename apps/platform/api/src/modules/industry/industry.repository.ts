import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { IndustrySavePayload } from "./industry.types.js";
export class IndustryRepository {
  async list() {
    return (
      await getPlatformDatabase().selectFrom("industries").selectAll().orderBy("name").execute()
    ).map((r) => ({
      code: r.code,
      description: r.description,
      id: Number(r.id),
      moduleKeys:
        typeof r.module_keys_json === "string"
          ? JSON.parse(r.module_keys_json)
          : r.module_keys_json,
      name: r.name,
      status: r.status,
      uuid: r.uuid
    }));
  }
  async create(input: IndustrySavePayload) {
    await getPlatformDatabase()
      .insertInto("industries")
      .values({
        code: input.code,
        description: input.description,
        module_keys_json: JSON.stringify(input.moduleKeys),
        name: input.name,
        status: input.status,
        uuid: randomBytes(4).toString("hex")
      })
      .execute();
    return (await this.list()).find((x) => x.code === input.code) ?? null;
  }
  async update(id: number, input: IndustrySavePayload) {
    await getPlatformDatabase()
      .updateTable("industries")
      .set({
        code: input.code,
        description: input.description,
        module_keys_json: JSON.stringify(input.moduleKeys),
        name: input.name,
        status: input.status
      })
      .where("id", "=", id)
      .execute();
    return (await this.list()).find((x) => x.id === id) ?? null;
  }
}
