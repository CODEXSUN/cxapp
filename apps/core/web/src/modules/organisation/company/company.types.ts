export type CompanyStatus = "active" | "suspend";

export type CompanyEmail = {
  id: number;
  email: string;
  emailType: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type CompanyPhone = {
  id: number;
  phone: string;
  phoneType: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type CompanyAddress = {
  id: number;
  addressTypeId: number | null;
  addressTypeName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  countryId: number | null;
  countryName: string | null;
  stateId: number | null;
  stateName: string | null;
  districtId: number | null;
  districtName: string | null;
  cityId: number | null;
  cityName: string | null;
  pincodeId: number | null;
  pincodeName: string | null;
  isDefault: boolean;
  sortOrder: number;
};

export type CompanyBankAccount = {
  id: number;
  bankNameId: number | null;
  bankName: string | null;
  accountType: string | null;
  accountNumber: string;
  holderName: string | null;
  ifsc: string | null;
  branch: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type CompanySocialLink = {
  id: number;
  platform: string;
  url: string;
  status: "active" | "inactive";
  isActive: boolean;
  sortOrder: number;
};

export type CompanyRecord = {
  id: number;
  code: string;
  name: string;
  legalName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  gstin: string | null;
  pan: string | null;
  msmeNo: string | null;
  msmeCategory: string | null;
  tanNo: string | null;
  tdsAvailable: boolean;
  tcsAvailable: boolean;
  website: string | null;
  description: string | null;
  logoPath: string | null;
  logoDarkPath: string | null;
  industryId: number | null;
  industryName: string | null;
  status: CompanyStatus;
  isActive: boolean;
  emails: CompanyEmail[];
  phones: CompanyPhone[];
  addresses: CompanyAddress[];
  bankAccounts: CompanyBankAccount[];
  socialLinks: CompanySocialLink[];
  createdAt: string;
  updatedAt: string;
};

export type CompanySavePayload = Omit<
  CompanyRecord,
  "id" | "createdAt" | "updatedAt" | "primaryEmail" | "primaryPhone" | "industryName"
>;

export type CompanyNamedLookup = { id: number; name: string; isActive?: boolean };
export type CompanyIndustryLookup = CompanyNamedLookup & { code: string };
export type CompanyCountryLookup = CompanyNamedLookup & { code: string };
export type CompanyStateLookup = CompanyNamedLookup & { countryId: number; code: string };
export type CompanyDistrictLookup = CompanyNamedLookup & { stateId: number };
export type CompanyCityLookup = CompanyNamedLookup & { districtId: number };
export type CompanyPincodeLookup = CompanyNamedLookup & { cityId: number; area: string };

export type CompanyLookups = {
  industries: CompanyIndustryLookup[];
  addressTypes: CompanyNamedLookup[];
  bankNames: CompanyNamedLookup[];
  countries: CompanyCountryLookup[];
  states: CompanyStateLookup[];
  districts: CompanyDistrictLookup[];
  cities: CompanyCityLookup[];
  pincodes: CompanyPincodeLookup[];
};

export type CompanyLookupCreate = {
  addressType: (name: string) => Promise<CompanyNamedLookup>;
  bankName: (name: string) => Promise<CompanyNamedLookup>;
  country: (name: string) => Promise<CompanyCountryLookup>;
  state: (name: string, countryId: number) => Promise<CompanyStateLookup>;
  district: (name: string, stateId: number) => Promise<CompanyDistrictLookup>;
  city: (name: string, districtId: number) => Promise<CompanyCityLookup>;
  pincode: (postalCode: string, area: string, cityId: number) => Promise<CompanyPincodeLookup>;
};
