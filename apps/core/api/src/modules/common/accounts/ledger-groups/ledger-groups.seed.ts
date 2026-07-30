import { LedgerGroupsRepository } from "./ledger-groups.repository.js";
export async function seedLedgerGroups() {
  const repository = new LedgerGroupsRepository();
  for (const name of ["-", "General"]) {
    if (!(await repository.findByName(name))) await repository.create({ name, status: "active" });
  }
}
