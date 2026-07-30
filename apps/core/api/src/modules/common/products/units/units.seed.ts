import { UnitsRepository } from "./units.repository.js";
import type { UnitsSavePayload } from "./units.types.js";

export const unitsSeed = {
  description: "Seed Units records.",
  key: "core.common.products.units.seed"
};

export async function seedUnits() {
  const repository = new UnitsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: UnitsSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Nos"
  },
  {
    name: "Kg"
  },
  {
    name: "Meter"
  },
  {
    name: "Litre"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
