import { sql } from "kysely";
import { getCoreDatabase } from "../../../../database/core-database.js";
import { LedgersRepository } from "./ledgers.repository.js";
export async function seedLedgers() {
  const repository = new LedgersRepository();
  const result = await sql<{
    id: number | string;
    name: string;
  }>`SELECT id,name FROM ledger_groups WHERE name='-' OR LOWER(name)='general'`.execute(
    getCoreDatabase()
  );
  const groups = new Map(result.rows.map((row) => [row.name.trim().toLowerCase(), Number(row.id)]));
  for (const seed of [
    { groupName: "-", name: "-" },
    { groupName: "general", name: "General Ledger" }
  ]) {
    const groupId = groups.get(seed.groupName);
    if (groupId && !(await repository.findByName(groupId, seed.name)))
      await repository.create({ ledgerGroupId: groupId, name: seed.name, status: "active" });
  }
}
