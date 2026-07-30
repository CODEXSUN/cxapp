import { TaxesRepository } from "./taxes.repository.js";
import type { TaxesSavePayload } from "./taxes.types.js";

export const taxesSeed = {
  description: "Seed Taxes records.",
  key: "core.common.products.taxes.seed"
};

export async function seedTaxes() {
  const repository = new TaxesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find(
      (record) => identity(record.ratePercent) === identity(seed.ratePercent)
    );
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: TaxesSavePayload[] = [
  {
    ratePercent: -1,
    description: "-"
  },
  {
    ratePercent: 0,
    description: "GST 0%"
  },
  {
    ratePercent: 5,
    description: "GST 5%"
  },
  {
    ratePercent: 12,
    description: "GST 12%"
  },
  {
    ratePercent: 18,
    description: "GST 18%"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
