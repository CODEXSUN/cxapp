import { TransportsRepository } from "./transports.repository.js";
import type { TransportsSavePayload } from "./transports.types.js";

export const transportsSeed = {
  description: "Seed Transports records.",
  key: "core.common.workorder.transports.seed"
};

export async function seedTransports() {
  const repository = new TransportsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: TransportsSavePayload[] = [
  {
    name: "-",
    gst: "-",
    vehicleNo: "-",
    address: "-",
    contactNo: "-",
    contactPerson: "-"
  },
  {
    name: "Self"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
