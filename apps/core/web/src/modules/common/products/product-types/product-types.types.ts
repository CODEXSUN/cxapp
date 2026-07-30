export type ProductTypesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductTypesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductTypesListFilters = { search?: string };
