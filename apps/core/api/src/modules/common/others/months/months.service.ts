import { AppError } from "@codexsun/framework/errors";
import { MonthsRepository } from "./months.repository.js";
import type { MonthsListFilters, MonthsRecord, MonthsSavePayload } from "./months.types.js";

export class MonthsService {
  constructor(private readonly repository = new MonthsRepository()) {}
  list(filters: MonthsListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: MonthsSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: MonthsSavePayload) {
    await this.mutable(id);
    this.validate(input);
    return this.save(() => this.repository.update(id, input));
  }
  async setActive(id: string, isActive: boolean) {
    await this.mutable(id);
    return this.repository.setActive(id, isActive);
  }
  async forceDelete(id: string) {
    await this.mutable(id);
    return this.repository.forceDelete(id);
  }
  private async mutable(id: string): Promise<MonthsRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Months record was not found.");
    return record;
  }
  private validate(input: MonthsSavePayload) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required.");
    if (!String(input.startDate ?? "").trim()) throw new Error("Start date is required.");
    if (!String(input.endDate ?? "").trim()) throw new Error("End date is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Months record already exists.");
      throw error;
    }
  }
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
