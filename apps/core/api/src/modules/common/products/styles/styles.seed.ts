import { StylesRepository } from "./styles.repository.js";
import type { StylesSavePayload } from "./styles.types.js";

export const stylesSeed = {
  description: "Seed Styles records.",
  key: "core.common.products.styles.seed"
};

export async function seedStyles() {
  const repository = new StylesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: StylesSavePayload[] = [
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
