import { AppError } from "@cxapp/framework/errors";
import { TaxesRepository } from "./taxes.repository.js";
import type { TaxesListFilters, TaxesRecord, TaxesSavePayload } from "./taxes.types.js";

export class TaxesService {
  constructor(private readonly repository = new TaxesRepository()) {}
  list(filters: TaxesListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: TaxesSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(canonicalTaxPayload(input)));
  }
  async update(id: string, input: TaxesSavePayload) {
    await this.mutable(id);
    this.validate(input);
    return this.save(() => this.repository.update(id, canonicalTaxPayload(input)));
  }
  async setActive(id: string, isActive: boolean) {
    await this.mutable(id);
    return this.repository.setActive(id, isActive);
  }
  async forceDelete(id: string) {
    await this.mutable(id);
    return this.repository.forceDelete(id);
  }
  private async mutable(id: string): Promise<TaxesRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Taxes record was not found.");
    return record;
  }
  private validate(input: TaxesSavePayload) {
    if (
      input.ratePercent === undefined ||
      input.ratePercent === null ||
      !Number.isFinite(Number(input.ratePercent)) ||
      Number(input.ratePercent) < 0
    )
      throw new Error("Rate percent is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Taxes record already exists.");
      throw error;
    }
  }
}

function canonicalTaxPayload(input: TaxesSavePayload): TaxesSavePayload {
  const ratePercent = Number(input.ratePercent);
  return { ...input, description: String(ratePercent), ratePercent };
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
