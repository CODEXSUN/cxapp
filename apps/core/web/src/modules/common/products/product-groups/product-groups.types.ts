export type ProductGroupsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductGroupsSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductGroupsListFilters = { search?: string };
