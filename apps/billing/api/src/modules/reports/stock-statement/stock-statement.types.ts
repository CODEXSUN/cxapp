export type StockStatementQuery = {
  companyId?: number | undefined;
  from?: string | undefined;
  page: number;
  pageSize: number;
  search: string;
  to?: string | undefined;
};

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

export type StockStatementResult = {
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
