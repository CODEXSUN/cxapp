import type { Kysely } from "kysely";

export const salesSeed = {
  description: "Sales owns no synthetic financial records; tenant sales begin empty.",
  key: "billing.sales.seed"
} as const;

export async function seedSalesModule<Database>(_database: Kysely<Database>) {
  return { inserted: 0, policy: "no-synthetic-financial-records" as const };
}
