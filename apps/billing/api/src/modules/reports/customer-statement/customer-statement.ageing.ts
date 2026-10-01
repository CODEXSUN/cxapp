export type CustomerStatementAgeing = {
  buckets: { label: string; amount: number }[];
  undatedOpening: number;
  creditBalance: number;
  reservedAmount: number;
  total: number;
};

export function buildCustomerStatementAgeing(
  invoices: { date: string; amount: number }[],
  opening: number,
  unappliedCredit: number,
  reservedAmount: number,
  asOf: string
): CustomerStatementAgeing {
  const cents = (value: number) => Math.round(value * 100);
  const buckets = [
    { label: "0–30 days", amount: 0 },
    { label: "31–60 days", amount: 0 },
    { label: "61–90 days", amount: 0 },
    { label: "91+ days", amount: 0 }
  ];
  let credit = cents(unappliedCredit) + Math.max(0, -cents(opening));
  let undated = Math.max(0, cents(opening));
  const openingCredit = Math.min(undated, credit);
  undated -= openingCredit;
  credit -= openingCredit;
  const end = Date.parse(asOf + "T00:00:00Z");
  for (const invoice of [...invoices].sort((a, b) => a.date.localeCompare(b.date))) {
    if (invoice.date > asOf) continue;
    let remaining = Math.max(0, cents(invoice.amount));
    const applied = Math.min(remaining, credit);
    remaining -= applied;
    credit -= applied;
    const days = Math.floor((end - Date.parse(invoice.date + "T00:00:00Z")) / 86400000);
    const index = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
    buckets[index]!.amount += remaining;
  }
  return {
    buckets: buckets.map((bucket) => ({ ...bucket, amount: bucket.amount / 100 })),
    undatedOpening: undated / 100,
    creditBalance: credit / 100,
    reservedAmount: cents(reservedAmount) / 100,
    total: (undated + buckets.reduce((sum, bucket) => sum + bucket.amount, 0) - credit) / 100
  };
}
