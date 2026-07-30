import { AppError } from "@codexsun/framework/errors";
import { StateRepository } from "./state.repository.js";
import type { State, StateListFilters, StateSavePayload, StateStatus } from "./state.types.js";

export class StateService {
  constructor(private readonly repository = new StateRepository()) {}

  list(filters: StateListFilters = {}) {
    return this.repository.list(filters);
  }

  get(id: string) {
    return this.repository.find(id);
  }

  async create(input: StateSavePayload) {
    const normalized = normalize(input);
    await this.requireCountry(normalized.countryId);
    return this.save(() => this.repository.create(normalized));
  }

  async update(id: string, input: StateSavePayload) {
    const state = await this.mutable(id);
    const normalized = normalize(input);
    await this.requireCountry(normalized.countryId);
    return (await this.save(() => this.repository.update(state.id, normalized)))!;
  }

  async setStatus(id: string, status: StateStatus) {
    const state = await this.mutable(id);
    return (await this.repository.setStatus(state.id, status))!;
  }

  async forceDelete(id: string) {
    const state = await this.mutable(id);
    const count = await this.repository.dependentCount(id);
    if (count > 0) {
      throw AppError.conflict(
        `State cannot be force deleted because it is referenced by ${count} districts.`,
        { count }
      );
    }
    return (await this.repository.forceDelete(state.id))!;
  }

  private async mutable(id: string): Promise<State> {
    const state = await this.repository.find(id);
    if (!state) throw AppError.notFound("State was not found.");
    if (isProtectedState(state)) {
      throw AppError.forbidden("The default state is protected and cannot be modified.");
    }
    return state;
  }

  private async requireCountry(countryId: string | number) {
    if (!(await this.repository.countryExists(countryId))) {
      throw AppError.notFound("Country was not found.");
    }
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("State code or name already exists for this country.");
      throw error;
    }
  }
}

function normalize(input: StateSavePayload): StateSavePayload {
  return {
    countryId: Number(input.countryId),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 1000,
    status: input.status === "inactive" ? "inactive" : "active"
  };
}

function isProtectedState(state: State) {
  return state.code === "UNKNOWN" || state.name.trim() === "-";
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
