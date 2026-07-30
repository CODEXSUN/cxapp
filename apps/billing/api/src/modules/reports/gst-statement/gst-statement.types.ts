export type GstStatementDirection = "inward" | "outward";

export type GstStatementQuery = {
  companyId?: number | undefined;
  from?: string | undefined;
  page: number;
  pageSize: number;
  to?: string | undefined;
};

export type GstStatementLine = {
  cgstAmount: number;
  direction: GstStatementDirection;
  documentCount: number;
  igstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  taxableAmount: number;
  taxRate: number;
};

export type GstStatementResult = {
  cgstAmount: number;
  companyId: number;
  companyName: string;
  financialYearId: number;
  financialYearName: string;
  from: string;
  igstAmount: number;
  inwardTaxAmount: number;
  inwardTaxableAmount: number;
  items: GstStatementLine[];
  netTaxPayable: number;
  outwardTaxAmount: number;
  outwardTaxableAmount: number;
  page: number;
  pageSize: number;
  sgstAmount: number;
  taxAmount: number;
  to: string;
  total: number;
};
