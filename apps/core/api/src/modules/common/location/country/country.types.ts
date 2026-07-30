export type CountryStatus = "active" | "inactive";

export type Country = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  status: CountryStatus;
};

export type CountrySavePayload = {
  code: string;
  name: string;
  sortOrder: number;
  status: CountryStatus;
};

export type CountryListFilters = { search?: string };
