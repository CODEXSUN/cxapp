import { AppError } from "@codexsun/framework/errors";
import { HsnCodesRepository } from "./hsn-codes.repository.js";
import type {
  HsnCodesListFilters,
  HsnCodesRecord,
  HsnCodesSavePayload
} from "./hsn-codes.types.js";

export class HsnCodesService {
  constructor(private readonly repository = new HsnCodesRepository()) {}
  list(filters: HsnCodesListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: HsnCodesSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: HsnCodesSavePayload) {
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
  private async mutable(id: string): Promise<HsnCodesRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("HSN Codes record was not found.");
    return record;
  }
  private validate(input: HsnCodesSavePayload) {
    if (!String(input.code ?? "").trim()) throw new Error("Code is required.");
    if (!String(input.description ?? "").trim()) throw new Error("Description is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("HSN Codes record already exists.");
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
