import { MonthsRepository } from "./months.repository.js";
import type { MonthsSavePayload } from "./months.types.js";

export const monthsSeed = {
  description: "Seed Months records.",
  key: "core.common.others.months.seed"
};

export async function seedMonths() {
  const repository = new MonthsRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: MonthsSavePayload[] = [
  {
    name: "-",
    startDate: "2000-01-01",
    endDate: "2000-01-01"
  },
  {
    name: "April-2026",
    startDate: "2026-04-01",
    endDate: "2026-04-30"
  },
  {
    name: "May-2026",
    startDate: "2026-05-01",
    endDate: "2026-05-31"
  },
  {
    name: "June-2026",
    startDate: "2026-06-01",
    endDate: "2026-06-30"
  },
  {
    name: "July-2026",
    startDate: "2026-07-01",
    endDate: "2026-07-31"
  },
  {
    name: "August-2026",
    startDate: "2026-08-01",
    endDate: "2026-08-31"
  },
  {
    name: "September-2026",
    startDate: "2026-09-01",
    endDate: "2026-09-30"
  },
  {
    name: "October-2026",
    startDate: "2026-10-01",
    endDate: "2026-10-31"
  },
  {
    name: "November-2026",
    startDate: "2026-11-01",
    endDate: "2026-11-30"
  },
  {
    name: "December-2026",
    startDate: "2026-12-01",
    endDate: "2026-12-31"
  },
  {
    name: "January-2027",
    startDate: "2027-01-01",
    endDate: "2027-01-31"
  },
  {
    name: "February-2027",
    startDate: "2027-02-01",
    endDate: "2027-02-28"
  },
  {
    name: "March-2027",
    startDate: "2027-03-01",
    endDate: "2027-03-31"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized.split("-")[0] ?? normalized;
}
