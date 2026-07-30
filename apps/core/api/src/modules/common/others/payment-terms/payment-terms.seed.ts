import { PaymentTermsRepository } from "./payment-terms.repository.js";
import type { PaymentTermsSavePayload } from "./payment-terms.types.js";

export const paymentTermsSeed = {
  description: "Seed Payment Terms records.",
  key: "core.common.others.paymentTerms.seed"
};

export async function seedPaymentTerms() {
  const repository = new PaymentTermsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: PaymentTermsSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Immediate"
  },
  {
    name: "Net 15"
  },
  {
    name: "Net 30"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
