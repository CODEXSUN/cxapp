import { AppError } from "@codexsun/framework/errors";
import { CurrenciesRepository } from "./currencies.repository.js";
import type {
  CurrenciesListFilters,
  CurrenciesRecord,
  CurrenciesSavePayload
} from "./currencies.types.js";

export class CurrenciesService {
  constructor(private readonly repository = new CurrenciesRepository()) {}
  list(filters: CurrenciesListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: CurrenciesSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: CurrenciesSavePayload) {
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
  private async mutable(id: string): Promise<CurrenciesRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Currencies record was not found.");
    return record;
  }
  private validate(input: CurrenciesSavePayload) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required.");
    if (!String(input.symbol ?? "").trim()) throw new Error("Symbol is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Currencies record already exists.");
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
