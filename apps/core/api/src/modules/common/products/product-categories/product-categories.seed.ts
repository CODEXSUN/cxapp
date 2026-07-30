import { ProductCategoriesRepository } from "./product-categories.repository.js";
import type { ProductCategoriesSavePayload } from "./product-categories.types.js";

export const productCategoriesSeed = {
  description: "Seed Product Categories records.",
  key: "core.common.products.productCategories.seed"
};

export async function seedProductCategories() {
  const repository = new ProductCategoriesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ProductCategoriesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "General"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
