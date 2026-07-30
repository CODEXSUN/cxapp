export type TaxesRecord = {
  id: number;
  ratePercent: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type TaxesSavePayload = {
  ratePercent?: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
};

export type TaxesListFilters = { search?: string };
