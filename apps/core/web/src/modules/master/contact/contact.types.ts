export type ContactStatus = "active" | "suspend" | "deleted";

export type ContactEmail = {
  id: number;
  email: string;
  emailType: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ContactPhone = {
  id: number;
  phone: string;
  phoneType: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ContactAddress = {
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

export type ContactBankAccount = {
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

export type ContactSocialLink = {
  id: number;
  platform: string;
  url: string;
  status: "active" | "inactive";
  isActive: boolean;
  sortOrder: number;
};

export type ContactRecord = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  legalName: string | null;
  typeId: number | null;
  typeName: string | null;
  groupId: number | null;
  groupName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  gstin: string | null;
  pan: string | null;
  msmeNo: string | null;
  msmeCategory: string | null;
  tanNo: string | null;
  tdsAvailable: boolean;
  tcsAvailable: boolean;
  openingBalance: number;
  creditLimit: number;
  website: string | null;
  description: string | null;
  status: ContactStatus;
  isActive: boolean;
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];
  bankAccounts: ContactBankAccount[];
  socialLinks: ContactSocialLink[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ContactSavePayload = {
  code: string;
  name: string;
  legalName: string | null;
  typeId: number;
  groupId: number | null;
  gstin: string | null;
  pan: string | null;
  msmeNo: string | null;
  msmeCategory: string | null;
  tanNo: string | null;
  tdsAvailable: boolean;
  tcsAvailable: boolean;
  openingBalance: number;
  creditLimit: number;
  website: string | null;
  description: string | null;
  status: "active" | "suspend";
  isActive: boolean;
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];
  bankAccounts: ContactBankAccount[];
  socialLinks: ContactSocialLink[];
};

export type ContactNextCode = { code: string };

export type ContactNamedLookup = {
  id: number;
  name: string;
  isActive?: boolean;
  status?: "active" | "inactive";
};

export type ContactCountryLookup = ContactNamedLookup & { code: string };
export type ContactStateLookup = ContactNamedLookup & { countryId: number; code: string };
export type ContactDistrictLookup = ContactNamedLookup & { stateId: number };
export type ContactCityLookup = ContactNamedLookup & { districtId: number };
export type ContactPincodeLookup = ContactNamedLookup & { cityId: number; area: string };

export type ContactLookups = {
  contactTypes: ContactNamedLookup[];
  contactGroups: ContactNamedLookup[];
  addressTypes: ContactNamedLookup[];
  bankNames: ContactNamedLookup[];
  countries: ContactCountryLookup[];
  states: ContactStateLookup[];
  districts: ContactDistrictLookup[];
  cities: ContactCityLookup[];
  pincodes: ContactPincodeLookup[];
};

export type ContactLookupCreate = {
  contactType: (name: string) => Promise<ContactNamedLookup>;
  contactGroup: (name: string) => Promise<ContactNamedLookup>;
  addressType: (name: string) => Promise<ContactNamedLookup>;
  bankName: (name: string) => Promise<ContactNamedLookup>;
  country: (name: string) => Promise<ContactCountryLookup>;
  state: (name: string, countryId: number) => Promise<ContactStateLookup>;
  district: (name: string, stateId: number) => Promise<ContactDistrictLookup>;
  city: (name: string, districtId: number) => Promise<ContactCityLookup>;
  pincode: (postalCode: string, area: string, cityId: number) => Promise<ContactPincodeLookup>;
};
