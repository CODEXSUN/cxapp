import { AppError } from "@codexsun/framework/errors";
import { ProductCategoriesRepository } from "./product-categories.repository.js";
import type {
  ProductCategoriesListFilters,
  ProductCategoriesRecord,
  ProductCategoriesSavePayload
} from "./product-categories.types.js";

export class ProductCategoriesService {
  constructor(private readonly repository = new ProductCategoriesRepository()) {}
  list(filters: ProductCategoriesListFilters = {}) {
    return this.repository.list(filters);
  }
  get(id: string) {
    return this.repository.find(id);
  }
  create(input: ProductCategoriesSavePayload) {
    this.validate(input);
    return this.save(() => this.repository.create(input));
  }
  async update(id: string, input: ProductCategoriesSavePayload) {
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
  private async mutable(id: string): Promise<ProductCategoriesRecord> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Product Categories record was not found.");
    return record;
  }
  private validate(input: ProductCategoriesSavePayload) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required.");
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Product Categories record already exists.");
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
