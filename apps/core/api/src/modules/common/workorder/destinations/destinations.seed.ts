import { DestinationsRepository } from "./destinations.repository.js";
import type { DestinationsSavePayload } from "./destinations.types.js";

export const destinationsSeed = {
  description: "Seed Destinations records.",
  key: "core.common.workorder.destinations.seed"
};

export async function seedDestinations() {
  const repository = new DestinationsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: DestinationsSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Local"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
