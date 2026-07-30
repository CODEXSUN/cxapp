export type BankNamesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type BankNamesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type BankNamesListFilters = { search?: string };
