import type { Kysely } from "kysely";

export const paymentSeedPolicy = {
  reason: "Financial payments are user-authored transactions and must never be synthetic.",
  seededRecords: 0
} as const;
export async function seedPaymentModule<Database>(_database: Kysely<Database>) {
  return paymentSeedPolicy;
}
