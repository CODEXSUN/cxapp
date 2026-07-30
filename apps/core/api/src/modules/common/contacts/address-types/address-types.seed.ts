import { AddressTypesRepository } from "./address-types.repository.js";
import type { AddressTypesSavePayload } from "./address-types.types.js";

export const addressTypesSeed = {
  description: "Seed Address Types records.",
  key: "core.common.contacts.addressTypes.seed"
};

export async function seedAddressTypes() {
  const repository = new AddressTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: AddressTypesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Billing"
  },
  {
    name: "Shipping"
  },
  {
    name: "Office"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
