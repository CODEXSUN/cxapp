import { AppError } from "@codexsun/framework/errors";
import { LedgersRepository } from "./ledgers.repository.js";
import type {
  LedgerListFilters,
  LedgerRecord,
  LedgerSavePayload,
  LedgerStatus
} from "./ledgers.types.js";
export class LedgersService {
  constructor(private readonly repository = new LedgersRepository()) {}
  list(filters: LedgerListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  async create(input: LedgerSavePayload) {
    const value = await this.validate(input);
    return this.save(() => this.repository.create(value));
  }
  async update(id: string, input: LedgerSavePayload) {
    const record = await this.mutable(id);
    const value = await this.validate(input);
    return (await this.save(() => this.repository.update(record.id, value)))!;
  }
  async setStatus(id: string, status: LedgerStatus) {
    const record = await this.mutable(id);
    return (await this.repository.setStatus(record.id, status))!;
  }
  async forceDelete(id: string) {
    const record = await this.mutable(id);
    return (await this.repository.forceDelete(record.id))!;
  }
  private async mutable(id: string): Promise<LedgerRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Ledger was not found.");
    if (["-", "general ledger"].includes(record.name.trim().toLowerCase()))
      throw AppError.forbidden("Default ledgers cannot be modified.");
    return record;
  }
  private async validate(input: LedgerSavePayload): Promise<LedgerSavePayload> {
    const name = input.name.trim();
    if (!name) throw AppError.validation("Ledger name is required.");
    const group = await this.repository.findGroup(input.ledgerGroupId);
    if (!group || group.status !== "active")
      throw AppError.validation("Selected ledger group was not found or is inactive.");
    return {
      ledgerGroupId: group.id,
      name,
      status: input.status === "inactive" ? "inactive" : "active"
    };
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY")
        throw AppError.conflict("Ledger name already exists in the selected ledger group.");
      throw error;
    }
  }
}
