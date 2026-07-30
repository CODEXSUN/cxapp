import { WarehousesRepository } from "./warehouses.repository.js";
import type { WarehousesSavePayload } from "./warehouses.types.js";

export const warehousesSeed = {
  description: "Seed Warehouses records.",
  key: "core.common.workorder.warehouses.seed"
};

export async function seedWarehouses() {
  const repository = new WarehousesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: WarehousesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "Main Warehouse"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized;
}
