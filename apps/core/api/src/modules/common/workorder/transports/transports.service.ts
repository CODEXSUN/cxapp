import { AppError } from "@codexsun/framework/errors";
import { TransportsRepository } from "./transports.repository.js";
import type {
  TransportsListFilters,
  TransportsRecord,
  TransportsSavePayload
} from "./transports.types.js";

export class TransportsService {
  constructor(private readonly repository = new TransportsRepository()) {}
  list(filters: TransportsListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: TransportsSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: TransportsSavePayload) {
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
  private async mutable(id: string): Promise<TransportsRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Transports record was not found.");
    return record;
  }
  private validate(input: TransportsSavePayload) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Transports record already exists.");
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
