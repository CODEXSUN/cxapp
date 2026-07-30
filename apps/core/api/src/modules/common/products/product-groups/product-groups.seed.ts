import { ProductGroupsRepository } from "./product-groups.repository.js";
import type { ProductGroupsSavePayload } from "./product-groups.types.js";

export const productGroupsSeed = {
  description: "Seed Product Groups records.",
  key: "core.common.products.productGroups.seed"
};

export async function seedProductGroups() {
  const repository = new ProductGroupsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ProductGroupsSavePayload[] = [
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
