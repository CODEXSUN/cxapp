import { AppError } from "@codexsun/framework/errors";
import { LedgerGroupsRepository } from "./ledger-groups.repository.js";
import type {
  LedgerGroupListFilters,
  LedgerGroupRecord,
  LedgerGroupSavePayload,
  LedgerGroupStatus
} from "./ledger-groups.types.js";
export class LedgerGroupsService {
  constructor(private readonly repository = new LedgerGroupsRepository()) {}
  list(filters: LedgerGroupListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: LedgerGroupSavePayload) {
    return this.save(() => this.repository.create(normalize(input)));
  }
  async update(id: string, input: LedgerGroupSavePayload) {
    const record = await this.mutable(id);
    return (await this.save(() => this.repository.update(record.id, normalize(input))))!;
  }
  async setStatus(id: string, status: LedgerGroupStatus) {
    const record = await this.mutable(id);
    if (status === "inactive" && (await this.repository.dependentCount(id)) > 0)
      throw AppError.conflict("Ledger group cannot be suspended while ledgers reference it.");
    return (await this.repository.setStatus(record.id, status))!;
  }
  async forceDelete(id: string) {
    const record = await this.mutable(id);
    const count = await this.repository.dependentCount(id);
    if (count > 0)
      throw AppError.conflict(
        `Ledger group cannot be force deleted because it is referenced by ${count} ledgers.`,
        { count }
      );
    return (await this.repository.forceDelete(record.id))!;
  }
  private async mutable(id: string): Promise<LedgerGroupRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Ledger group was not found.");
    if (["-", "general"].includes(record.name.trim().toLowerCase()))
      throw AppError.forbidden("Default ledger groups cannot be modified.");
    return record;
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY")
        throw AppError.conflict("Ledger group name already exists.");
      throw error;
    }
  }
}
function normalize(input: LedgerGroupSavePayload): LedgerGroupSavePayload {
  const name = input.name.trim();
  if (!name) throw AppError.validation("Ledger group name is required.");
  return { name, status: input.status === "inactive" ? "inactive" : "active" };
}
