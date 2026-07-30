import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { getCoreDatabase } from "../../../database/core-database.js";
export async function seedWorkOrderModule() {
  await sql`INSERT IGNORE INTO work_orders (uuid, code, name, status) VALUES (${randomBytes(4).toString("hex")}, 'WO-0000', '-', 'active')`.execute(
    getCoreDatabase()
  );
}
