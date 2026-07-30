export type ProductCategoriesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductCategoriesSavePayload = {
  name: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ProductCategoriesListFilters = { search?: string };
