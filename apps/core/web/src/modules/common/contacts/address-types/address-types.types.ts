export type AddressTypesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type AddressTypesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type AddressTypesListFilters = { search?: string };
