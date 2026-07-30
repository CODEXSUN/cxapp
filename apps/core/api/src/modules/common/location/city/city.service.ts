import { AppError } from "@codexsun/framework/errors";
import { CityRepository } from "./city.repository.js";
import type { City, CityListFilters, CitySavePayload, CityStatus } from "./city.types.js";

export class CityService {
  constructor(private readonly repository = new CityRepository()) {}

  list(filters: CityListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }

  async create(input: CitySavePayload) {
    const normalized = normalize(input);
    await this.requireDistrict(normalized.districtId);
    return this.save(() => this.repository.create(normalized));
  }

  async update(id: string, input: CitySavePayload) {
    const city = await this.mutable(id);
    const normalized = normalize(input);
    await this.requireDistrict(normalized.districtId);
    return (await this.save(() => this.repository.update(city.id, normalized)))!;
  }

  async setStatus(id: string, status: CityStatus) {
    const city = await this.mutable(id);
    return (await this.repository.setStatus(city.id, status))!;
  }

  async forceDelete(id: string) {
    const city = await this.mutable(id);
    const count = await this.repository.dependentCount(id);
    if (count > 0) {
      throw AppError.conflict(
        `City cannot be force deleted because it is referenced by ${count} pincodes.`,
        { count }
      );
    }
    return (await this.repository.forceDelete(city.id))!;
  }

  private async mutable(id: string): Promise<City> {
    const city = await this.repository.find(id);
    if (!city) throw AppError.notFound("City was not found.");
    if (city.name.trim() === "-")
      throw AppError.forbidden("The default city is protected and cannot be modified.");
    return city;
  }

  private async requireDistrict(districtId: string | number) {
    if (!(await this.repository.districtExists(districtId)))
      throw AppError.notFound("District was not found.");
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("City name already exists for this district.");
      throw error;
    }
  }
}

function normalize(input: CitySavePayload): CitySavePayload {
  return {
    districtId: Number(input.districtId),
    name: input.name.trim(),
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 1000,
    status: input.status === "inactive" ? "inactive" : "active"
  };
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
