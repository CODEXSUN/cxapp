export type WarehousesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type WarehousesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type WarehousesListFilters = { search?: string };
