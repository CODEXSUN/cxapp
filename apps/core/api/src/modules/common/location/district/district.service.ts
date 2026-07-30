import { AppError } from "@codexsun/framework/errors";
import { DistrictRepository } from "./district.repository.js";
import type {
  District,
  DistrictListFilters,
  DistrictSavePayload,
  DistrictStatus
} from "./district.types.js";

export class DistrictService {
  constructor(private readonly repository = new DistrictRepository()) {}

  list(filters: DistrictListFilters = {}) {
    return this.repository.list(filters);
  }

  get(id: string) {
    return this.repository.find(id);
  }

  async create(input: DistrictSavePayload) {
    const normalized = normalize(input);
    await this.requireState(normalized.stateId);
    return this.save(() => this.repository.create(normalized));
  }

  async update(id: string, input: DistrictSavePayload) {
    const district = await this.mutable(id);
    const normalized = normalize(input);
    await this.requireState(normalized.stateId);
    return (await this.save(() => this.repository.update(district.id, normalized)))!;
  }

  async setStatus(id: string, status: DistrictStatus) {
    const district = await this.mutable(id);
    return (await this.repository.setStatus(district.id, status))!;
  }

  async forceDelete(id: string) {
    const district = await this.mutable(id);
    const count = await this.repository.dependentCount(id);
    if (count > 0) {
      throw AppError.conflict(
        `District cannot be force deleted because it is referenced by ${count} cities.`,
        { count }
      );
    }
    return (await this.repository.forceDelete(district.id))!;
  }

  private async mutable(id: string): Promise<District> {
    const district = await this.repository.find(id);
    if (!district) throw AppError.notFound("District was not found.");
    if (district.name.trim() === "-")
      throw AppError.forbidden("The default district is protected and cannot be modified.");
    return district;
  }

  private async requireState(stateId: string | number) {
    if (!(await this.repository.stateExists(stateId))) {
      throw AppError.notFound("State was not found.");
    }
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("District name already exists for this state.");
      throw error;
    }
  }
}

function normalize(input: DistrictSavePayload): DistrictSavePayload {
  return {
    stateId: Number(input.stateId),
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
