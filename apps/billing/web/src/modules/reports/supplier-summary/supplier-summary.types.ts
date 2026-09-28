export type SupplierSummaryItem = {
  balance: number;
  code: string;
  credit: number;
  debit: number;
  id: number;
  name: string;
};

export type SupplierSummary = {
  companyId: number;
  companyName: string;
  financialYearId: number;
  financialYearName: string;
  items: SupplierSummaryItem[];
  total: number;
  totalBalance: number;
  totalCredit: number;
  totalDebit: number;
};
