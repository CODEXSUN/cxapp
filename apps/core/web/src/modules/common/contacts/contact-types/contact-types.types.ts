export type ContactTypesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ContactTypesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ContactTypesListFilters = { search?: string };
