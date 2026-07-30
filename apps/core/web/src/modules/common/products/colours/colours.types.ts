export type ColoursRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ColoursSavePayload = {
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ColoursListFilters = { search?: string };
