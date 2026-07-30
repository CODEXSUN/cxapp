export type HsnCodesRecord = {
  id: number;
  code: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type HsnCodesSavePayload = {
  code?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
};

export type HsnCodesListFilters = { search?: string };
