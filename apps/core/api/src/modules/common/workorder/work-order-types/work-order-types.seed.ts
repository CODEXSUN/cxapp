import { WorkOrderTypesRepository } from "./work-order-types.repository.js";
import type { WorkOrderTypesSavePayload } from "./work-order-types.types.js";

export const workOrderTypesSeed = {
  description: "Seed Work Order Types records.",
  key: "core.common.workorder.workOrderTypes.seed"
};

export async function seedWorkOrderTypes() {
  const repository = new WorkOrderTypesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: WorkOrderTypesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "General"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
