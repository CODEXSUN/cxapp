import { SizesRepository } from "./sizes.repository.js";
import type { SizesSavePayload } from "./sizes.types.js";

export const sizesSeed = {
  description: "Seed Sizes records.",
  key: "core.common.products.sizes.seed"
};

export async function seedSizes() {
  const repository = new SizesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: SizesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Standard"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
