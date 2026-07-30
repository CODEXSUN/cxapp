export type CityStatus = "active" | "inactive";

export type City = {
  id: number;
  districtId: number;
  districtName: string;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
  name: string;
  sortOrder: number;
  status: CityStatus;
};

export type CitySavePayload = {
  districtId: number;
  name: string;
  sortOrder: number;
  status: CityStatus;
};

export type CityListFilters = { districtId?: string; search?: string };
