export type StateStatus = "active" | "inactive";

export type State = {
  id: number;
  countryId: number;
  countryName: string;
  code: string;
  name: string;
  sortOrder: number;
  status: StateStatus;
};

export type StateSavePayload = {
  countryId: number;
  code: string;
  name: string;
  sortOrder: number;
  status: StateStatus;
};

export type StateListFilters = { countryId?: string; search?: string };
