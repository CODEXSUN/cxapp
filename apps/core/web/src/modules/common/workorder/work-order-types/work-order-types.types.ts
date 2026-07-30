export type WorkOrderTypesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type WorkOrderTypesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type WorkOrderTypesListFilters = { search?: string };
