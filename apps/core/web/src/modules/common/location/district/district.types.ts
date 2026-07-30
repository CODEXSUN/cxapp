export type DistrictStatus = "active" | "inactive";
export type DistrictRecord = {
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
export type DistrictListFilters = { stateId?: number; search?: string };
export type StateOption = {
  id: number;
  name: string;
  status: DistrictStatus;
  countryId: number;
  countryName: string;
};
