export type PincodeStatus = "active" | "inactive";
export type PincodeRecord = {
  id: number;
  cityId: number;
  cityName: string;
  districtId: number;
  districtName: string;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
  name: string;
  area: string;
  sortOrder: number;
  status: PincodeStatus;
};
export type PincodeSavePayload = {
  cityId: number;
  name: string;
  area: string;
  sortOrder: number;
  status: PincodeStatus;
};
export type PincodeListFilters = { cityId?: number; search?: string };
export type CityOption = {
  id: number;
  name: string;
  status: PincodeStatus;
  districtId: number;
  districtName: string;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
};
