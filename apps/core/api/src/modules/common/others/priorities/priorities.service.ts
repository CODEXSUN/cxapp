import { AppError } from "@codexsun/framework/errors";
import { PrioritiesRepository } from "./priorities.repository.js";
import type {
  PrioritiesListFilters,
  PrioritiesRecord,
  PrioritiesSavePayload
} from "./priorities.types.js";

export class PrioritiesService {
  constructor(private readonly repository = new PrioritiesRepository()) {}
  list(filters: PrioritiesListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: PrioritiesSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: PrioritiesSavePayload) {
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
  private async mutable(id: string): Promise<PrioritiesRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Priorities record was not found.");
    return record;
  }
  private validate(input: PrioritiesSavePayload) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required.");
    if (!String(input.colour ?? "").trim()) throw new Error("Colour is required.");
    if (!String(input.tag ?? "").trim()) throw new Error("Tag is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Priorities record already exists.");
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
