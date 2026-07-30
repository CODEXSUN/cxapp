import { ColoursRepository } from "./colours.repository.js";
import type { ColoursSavePayload } from "./colours.types.js";

export const coloursSeed = {
  description: "Seed Colours records.",
  key: "core.common.products.colours.seed"
};

export async function seedColours() {
  const repository = new ColoursRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ColoursSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Black"
  },
  {
    name: "White"
  },
  {
    name: "Blue"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
