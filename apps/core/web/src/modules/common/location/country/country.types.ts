export type CountryStatus = "active" | "inactive";

export type CountryRecord = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  status: CountryStatus;
};

export type CountrySavePayload = Omit<CountryRecord, "id">;

export type CountryListFilters = {
  search?: string;
};
