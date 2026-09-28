export type CustomerSummaryItem = {
  balance: number;
  code: string;
  credit: number;
  debit: number;
  id: number;
  name: string;
};

export type CustomerSummaryResult = {
  companyId: number;
  companyName: string;
  financialYearId: number;
  financialYearName: string;
  items: CustomerSummaryItem[];
  total: number;
  totalBalance: number;
  totalCredit: number;
  totalDebit: number;
};
