import { CurrenciesRepository } from "./currencies.repository.js";
import type { CurrenciesSavePayload } from "./currencies.types.js";

export const currenciesSeed = {
  description: "Seed Currencies records.",
  key: "core.common.others.currencies.seed"
};

export async function seedCurrencies() {
  const repository = new CurrenciesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: CurrenciesSavePayload[] = [
  {
    name: "-",
    symbol: "-"
  },
  {
    name: "INR",
    symbol: "₹"
  },
  {
    name: "USD",
    symbol: "$"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
