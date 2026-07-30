export type StockRejectionTypesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type StockRejectionTypesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type StockRejectionTypesListFilters = { search?: string };
