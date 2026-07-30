export type CurrenciesRecord = {
  id: number;
  name: string;
  symbol: string;
  isActive: boolean;
  sortOrder: number;
};

export type CurrenciesSavePayload = {
  name: string;
  symbol: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type CurrenciesListFilters = { search?: string };
