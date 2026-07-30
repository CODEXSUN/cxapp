import { AppError } from "@codexsun/framework/errors";
import { PincodeRepository } from "./pincode.repository.js";
import type {
  Pincode,
  PincodeListFilters,
  PincodeSavePayload,
  PincodeStatus
} from "./pincode.types.js";

export class PincodeService {
  constructor(private readonly repository = new PincodeRepository()) {}

  list(filters: PincodeListFilters = {}) {
    return this.repository.list(filters);
  }
  listWithRelations(filters: PincodeListFilters = {}) {
    return this.repository.listWithRelations(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  getWithRelations(id: string) {
    return this.repository.findWithRelations(id);
  }

  async create(input: PincodeSavePayload) {
    const normalized = normalize(input);
    await this.requireCity(normalized.cityId);
    return this.save(() => this.repository.create(normalized));
  }

  async update(id: string, input: PincodeSavePayload) {
    const pincode = await this.mutable(id);
    const normalized = normalize(input);
    await this.requireCity(normalized.cityId);
    return (await this.save(() => this.repository.update(pincode.id, normalized)))!;
  }

  async setStatus(id: string, status: PincodeStatus) {
    const pincode = await this.mutable(id);
    return (await this.repository.setStatus(pincode.id, status))!;
  }

  async forceDelete(id: string) {
    const pincode = await this.mutable(id);
    return (await this.repository.forceDelete(pincode.id))!;
  }

  private async mutable(id: string): Promise<Pincode> {
    const pincode = await this.repository.find(id);
    if (!pincode) throw AppError.notFound("Pincode was not found.");
    if (pincode.name.trim() === "-")
      throw AppError.forbidden("The default pincode is protected and cannot be modified.");
    return pincode;
  }

  private async requireCity(cityId: string | number) {
    if (!(await this.repository.cityExists(cityId))) throw AppError.notFound("City was not found.");
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("Pincode and area already exist for this city.");
      throw error;
    }
  }
}

function normalize(input: PincodeSavePayload): PincodeSavePayload {
  const name = input.name.trim();
  const area = input.area.trim();
  if (name.length < 2 || name.length > 20)
    throw AppError.validation("Postal code must contain between 2 and 20 characters.");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9 -]*[A-Za-z0-9])?$/.test(name))
    throw AppError.validation("Postal code may contain letters, numbers, spaces, and hyphens.");
  if (!area) throw AppError.validation("Area is required.");
  return {
    cityId: Number(input.cityId),
    name,
    area,
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
