export type PincodeStatus = "active" | "inactive";

export type Pincode = {
  id: number;
  cityId: number;
  name: string;
  area: string;
  sortOrder: number;
  status: PincodeStatus;
};

export type PincodeWithRelations = Pincode & {
  cityName: string;
  districtId: number;
  districtName: string;
  stateId: number;
  stateName: string;
  countryId: number;
  countryName: string;
};

export type PincodeSavePayload = {
  cityId: number;
  name: string;
  area: string;
  sortOrder: number;
  status: PincodeStatus;
};

export type PincodeListFilters = { cityId?: string; search?: string };
