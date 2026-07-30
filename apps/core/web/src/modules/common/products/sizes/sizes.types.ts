export type SizesRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type SizesSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type SizesListFilters = { search?: string };
