import { ContactGroupsRepository } from "./contact-groups.repository.js";
import type { ContactGroupsSavePayload } from "./contact-groups.types.js";

export const contactGroupsSeed = {
  description: "Seed Contact Groups records.",
  key: "core.common.contacts.contactGroups.seed"
};

export async function seedContactGroups() {
  const repository = new ContactGroupsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: ContactGroupsSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Business"
  },
  {
    name: "Web Clients"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
