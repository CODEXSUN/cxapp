export async function seedOpeningBalances() {
  // Opening balances require an explicit operator review. No financial defaults are seeded.
  return { inserted: 0 };
}
