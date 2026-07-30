import { HsnCodesRepository } from "./hsn-codes.repository.js";
import type { HsnCodesSavePayload } from "./hsn-codes.types.js";

export const hsnCodesSeed = {
  description: "Seed HSN Codes records.",
  key: "core.common.products.hsnCodes.seed"
};

export async function seedHsnCodes() {
  const repository = new HsnCodesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.code) === identity(seed.code));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: HsnCodesSavePayload[] = [
  {
    code: "-",
    description: "-"
  },
  {
    code: "0000",
    description: "General"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
