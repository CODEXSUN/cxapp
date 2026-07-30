import { AppError } from "@codexsun/framework/errors";
import { ProductRepository } from "./product.repository.js";
import type { ProductListFilters, ProductSaveInput } from "./product.types.js";
export class ProductService {
  constructor(private readonly repository = new ProductRepository()) {}
  list(filters: ProductListFilters = {}) {
    return this.repository.list(filters);
  }
  find(id: string) {
    return this.repository.find(id);
  }
  async create(input: ProductSaveInput) {
    const value = await this.withDefaults(input);
    await this.validateReferences(value);
    return this.repository.create(value);
  }
  async update(id: string, input: ProductSaveInput) {
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Product was not found.");
    const value = await this.withDefaults(input, current);
    await this.validateReferences(value);
    return this.repository.update(id, value);
  }

  private async withDefaults(input: ProductSaveInput, current?: ProductSaveInput) {
    const defaults = await this.repository.defaultReferences();
    return {
      ...input,
      typeId: input.typeId || current?.typeId || defaults.typeId,
      productCategoryId:
        input.productCategoryId || current?.productCategoryId || defaults.productCategoryId,
      hsnCodeId: input.hsnCodeId || current?.hsnCodeId || defaults.hsnCodeId,
      unitId: input.unitId || current?.unitId || defaults.unitId,
      taxId: input.taxId || current?.taxId || defaults.taxId
    };
  }
  setActive(id: string, active: boolean) {
    return this.repository.setActive(id, active);
  }
  forceDelete(id: string) {
    return this.repository.forceDelete(id);
  }

  private async validateReferences(input: ProductSaveInput) {
    const validations = [
      [input.typeId, "product type", (id: number) => this.repository.hasActiveProductType(id)],
      [
        input.productCategoryId,
        "product category",
        (id: number) => this.repository.hasActiveProductCategory(id)
      ],
      [input.hsnCodeId, "HSN code", (id: number) => this.repository.hasActiveHsnCode(id)],
      [input.unitId, "unit", (id: number) => this.repository.hasActiveUnit(id)],
      [input.taxId, "GST tax", (id: number) => this.repository.hasActiveTax(id)]
    ] as const;
    for (const [id, label, exists] of validations) {
      if (id != null && !(await exists(Number(id)))) {
        throw AppError.validation(`Selected ${label} was not found or is inactive.`);
      }
    }
  }
}
