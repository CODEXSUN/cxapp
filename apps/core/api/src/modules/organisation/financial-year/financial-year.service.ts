import { AppError } from "@codexsun/framework/errors";
import { FinancialYearRepository } from "./financial-year.repository.js";
import type { FinancialYearListFilters, FinancialYearSavePayload } from "./financial-year.types.js";

export class FinancialYearService {
  constructor(private readonly repository = new FinancialYearRepository()) {}
  list(filters: FinancialYearListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  current() {
    return this.repository.current();
  }
  create(input: FinancialYearSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: FinancialYearSavePayload) {
    await this.required(id);
    this.validate(input);
    return this.save(() => this.repository.update(id, input));
  }
  async setCurrent(id: string) {
    const record = await this.required(id);
    if (record.status !== "active")
      throw AppError.conflict("Only an active financial year can be current.");
    return this.repository.setCurrent(id);
  }
  async setActive(id: string, active: boolean) {
    const record = await this.required(id);
    if (!active && record.isCurrent)
      throw AppError.conflict("The current financial year cannot be suspended.");
    return this.repository.setActive(id, active);
  }
  async forceDelete(id: string) {
    const record = await this.required(id);
    if (record.isCurrent) throw AppError.conflict("The current financial year cannot be deleted.");
    if (await this.repository.isDefault(id))
      throw AppError.conflict("This financial year is used by Default Company.");
    return this.repository.forceDelete(id);
  }
  private async required(id: string) {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Financial year was not found.");
    return record;
  }
  private validate(input: FinancialYearSavePayload) {
    if (!input.name.trim()) throw AppError.validation("Financial year name is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate))
      throw AppError.validation("Start date and end date are required.");
    if (input.startDate >= input.endDate)
      throw AppError.validation("End date must be after start date.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY")
        throw AppError.conflict(
          "A financial year with the same name or date range already exists."
        );
      throw error;
    }
  }
}
