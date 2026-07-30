export type StylesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type StylesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type StylesListFilters = { search?: string };
