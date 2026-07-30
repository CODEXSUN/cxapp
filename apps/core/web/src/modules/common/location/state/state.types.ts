export type StateStatus = "active" | "inactive";

export type StateRecord = {
  id: number;
  countryId: number;
  countryName: string;
  code: string;
  name: string;
  sortOrder: number;
  status: StateStatus;
};

export type StateSavePayload = Omit<StateRecord, "countryName" | "id">;

export type StateListFilters = { countryId?: number; search?: string };

export type CountryOption = { id: number; code: string; name: string; status: StateStatus };
