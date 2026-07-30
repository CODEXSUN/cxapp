import { PrioritiesRepository } from "./priorities.repository.js";
import type { PrioritiesSavePayload } from "./priorities.types.js";

export const prioritiesSeed = {
  description: "Seed Priorities records.",
  key: "core.common.others.priorities.seed"
};

export async function seedPriorities() {
  const repository = new PrioritiesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: PrioritiesSavePayload[] = [
  {
    name: "-",
    colour: "-",
    tag: "-"
  },
  {
    name: "High",
    colour: "#dc2626",
    tag: "HIGH"
  },
  {
    name: "Normal",
    colour: "#2563eb",
    tag: "NORMAL"
  },
  {
    name: "Low",
    colour: "#16a34a",
    tag: "LOW"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
