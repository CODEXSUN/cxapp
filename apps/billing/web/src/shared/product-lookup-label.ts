type ProductLookupLabelRecord = {
  code?: string | null;
  id: string;
  name?: string | null;
  ratePercent?: number | null;
  taxRate?: number | null;
};

export function productLookupDisplayLabel(record: ProductLookupLabelRecord) {
  const label = record.name || record.code || record.id;
  const rate = Number(record.taxRate ?? record.ratePercent);
  return Number.isFinite(rate) && rate >= 0 ? `${label} @ ${rate}%` : label;
}
