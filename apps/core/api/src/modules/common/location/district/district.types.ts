export type DistrictStatus = "active" | "inactive";

export type District = {
  id: number;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
  name: string;
  sortOrder: number;
  status: DistrictStatus;
};

export type DistrictSavePayload = {
  stateId: number;
  name: string;
  sortOrder: number;
  status: DistrictStatus;
};

export type DistrictListFilters = { stateId?: string; search?: string };
