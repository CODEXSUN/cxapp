export type StockStatementLine = {
  closingQuantity: number;
  hsnCode: string;
  inwardQuantity: number;
  openingQuantity: number;
  outwardQuantity: number;
  productId: number;
  productName: string;
  purchaseValue: number;
  salesValue: number;
  unitName: string;
};

export type StockStatement = {
  closingQuantity: number;
  companyId: number;
  companyName: string;
  financialYearId: number;
  financialYearName: string;
  from: string;
  inwardQuantity: number;
  items: StockStatementLine[];
  openingQuantity: number;
  outwardQuantity: number;
  page: number;
  pageSize: number;
  purchaseValue: number;
  salesValue: number;
  search: string;
  to: string;
  total: number;
};

export type StockStatementFilters = {
  from: string;
  page: number;
  pageSize: number;
  search: string;
  to: string;
};
