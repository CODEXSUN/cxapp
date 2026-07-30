import { AppError } from "@codexsun/framework/errors";
import { CountryRepository } from "./country.repository.js";
import type {
  Country,
  CountryListFilters,
  CountrySavePayload,
  CountryStatus
} from "./country.types.js";

export class CountryService {
  constructor(private readonly repository = new CountryRepository()) {}

  list(filters: CountryListFilters = {}) {
    return this.repository.list(filters);
  }

  get(id: string) {
    return this.repository.find(id);
  }

  create(input: CountrySavePayload) {
    return this.save(() => this.repository.create(normalize(input)));
  }

  async update(id: string, input: CountrySavePayload) {
    const country = await this.mutable(id);
    return (await this.save(() => this.repository.update(country.id, normalize(input))))!;
  }

  async setStatus(id: string, status: CountryStatus) {
    const country = await this.mutable(id);
    return (await this.repository.setStatus(country.id, status))!;
  }

  async forceDelete(id: string) {
    const country = await this.mutable(id);
    const count = await this.repository.dependentCount(id);
    if (count > 0) {
      throw AppError.conflict(
        `Country cannot be force deleted because it is referenced by ${count} states.`,
        { count }
      );
    }
    return (await this.repository.forceDelete(country.id))!;
  }

  private async mutable(id: string): Promise<Country> {
    const country = await this.repository.find(id);
    if (!country) throw AppError.notFound("Country was not found.");
    if (isProtectedCountry(country)) {
      throw AppError.forbidden("Default countries cannot be modified.");
    }
    return country;
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Country code or name already exists.");
      throw error;
    }
  }
}

function normalize(input: CountrySavePayload): CountrySavePayload {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 1000,
    status: input.status === "inactive" ? "inactive" : "active"
  };
}

function isProtectedCountry(country: Country) {
  return (
    country.code.trim().toUpperCase() === "IN" || country.name.trim().toLowerCase() === "india"
  );
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
