import { ContactTypesRepository } from "./contact-types.repository.js";
import type { ContactTypesSavePayload } from "./contact-types.types.js";

export const contactTypesSeed = {
  description: "Seed Contact Types records.",
  key: "core.common.contacts.contactTypes.seed"
};

export async function seedContactTypes() {
  const repository = new ContactTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ContactTypesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Customer"
  },
  {
    name: "Supplier"
  },
  {
    name: "Vendor Customer"
  },
  {
    name: "Staff"
  },
  {
    name: "Employee"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
