import { StockRejectionTypesRepository } from "./stock-rejection-types.repository.js";
import type { StockRejectionTypesSavePayload } from "./stock-rejection-types.types.js";

export const stockRejectionTypesSeed = {
  description: "Seed Stock Rejection Types records.",
  key: "core.common.workorder.stockRejectionTypes.seed"
};

export async function seedStockRejectionTypes() {
  const repository = new StockRejectionTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: StockRejectionTypesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Damaged"
  },
  {
    name: "Quality issue"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
