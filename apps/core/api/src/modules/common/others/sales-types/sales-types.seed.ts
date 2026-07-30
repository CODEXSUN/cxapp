import { SalesTypesRepository } from "./sales-types.repository.js";
import type { SalesTypesSavePayload } from "./sales-types.types.js";

export const salesTypesSeed = {
  description: "Seed Sales Types records.",
  key: "core.common.others.salesTypes.seed"
};

export async function seedSalesTypes() {
  const repository = new SalesTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: SalesTypesSavePayload[] = [
  {
    name: "-",
    description: "-"
  },
  {
    name: "Retail",
    description: "Retail sale"
  },
  {
    name: "Wholesale",
    description: "Wholesale sale"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
