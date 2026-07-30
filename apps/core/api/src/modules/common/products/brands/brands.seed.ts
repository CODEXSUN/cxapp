import { BrandsRepository } from "./brands.repository.js";
import type { BrandsSavePayload } from "./brands.types.js";

export const brandsSeed = {
  description: "Seed Brands records.",
  key: "core.common.products.brands.seed"
};

export async function seedBrands() {
  const repository = new BrandsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: BrandsSavePayload[] = [
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
