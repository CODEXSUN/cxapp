export type UnitsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type UnitsSavePayload = {
  name: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UnitsListFilters = { search?: string };
