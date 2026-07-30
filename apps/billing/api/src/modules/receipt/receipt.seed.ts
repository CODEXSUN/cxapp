import type { Kysely } from "kysely";

export const receiptSeedPolicy = {
  reason: "Financial receipts are user-authored transactions and must never be synthetic.",
  seededRecords: 0
} as const;
export async function seedReceiptModule<Database>(_database: Kysely<Database>) {
  return receiptSeedPolicy;
}
