import type { Kysely } from "kysely";

export const exportSalesSeed = {
  description: "Export Sales owns no synthetic financial records; tenant export sales begin empty.",
  key: "billing.export-sales.seed"
} as const;

export async function seedExportSalesModule<Database>(_database: Kysely<Database>) {
  return { inserted: 0, policy: "no-synthetic-financial-records" as const };
}
