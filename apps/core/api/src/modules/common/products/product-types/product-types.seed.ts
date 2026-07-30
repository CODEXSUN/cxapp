import { ProductTypesRepository } from "./product-types.repository.js";
import type { ProductTypesSavePayload } from "./product-types.types.js";

export const productTypesSeed = {
  description: "Seed Product Types records.",
  key: "core.common.products.productTypes.seed"
};

export async function seedProductTypes() {
  const repository = new ProductTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ProductTypesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Goods"
  },
  {
    name: "Service"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
