export type BrandsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type BrandsSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type BrandsListFilters = { search?: string };
