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

export type ContactSaveInput = {
  code?: string | undefined;
  name: string;
  legalName?: string | null | undefined;
  typeId: number;
  typeName?: string | null | undefined;
  groupId?: number | null | undefined;
  groupName?: string | null | undefined;
  gstin?: string | null | undefined;
  pan?: string | null | undefined;
  msmeNo?: string | null | undefined;
  msmeCategory?: string | null | undefined;
  tanNo?: string | null | undefined;
  tdsAvailable?: boolean | undefined;
  tcsAvailable?: boolean | undefined;
  openingBalance?: number | undefined;
  creditLimit?: number | undefined;
  website?: string | null | undefined;
  description?: string | null | undefined;
  status?: ContactStatus | undefined;
  isActive?: boolean | undefined;
  emails?:
    | Array<
        Omit<ContactEmail, "id" | "sortOrder"> & {
          id?: number | undefined;
          sortOrder?: number | undefined;
        }
      >
    | undefined;
  phones?:
    | Array<
        Omit<ContactPhone, "id" | "sortOrder"> & {
          id?: number | undefined;
          sortOrder?: number | undefined;
        }
      >
    | undefined;
  addresses?:
    | Array<
        Omit<ContactAddress, "id" | "sortOrder"> & {
          id?: number | undefined;
          sortOrder?: number | undefined;
        }
      >
    | undefined;
  bankAccounts?:
    | Array<
        Omit<ContactBankAccount, "id" | "sortOrder"> & {
          id?: number | undefined;
          sortOrder?: number | undefined;
        }
      >
    | undefined;
  socialLinks?:
    | Array<
        Omit<ContactSocialLink, "id" | "isActive" | "sortOrder"> & {
          id?: number | undefined;
          isActive?: boolean | undefined;
          sortOrder?: number | undefined;
        }
      >
    | undefined;
};

export type ContactListFilters = { search?: string };

export type ContactReference = { id: number; name: string };
export type ContactLocationReference = ContactReference & { parentId: number | null };

export type ContactAddressUpdateInput = {
  [Key in keyof Omit<ContactAddress, "id" | "sortOrder">]?: Omit<
    ContactAddress,
    "id" | "sortOrder"
  >[Key] | undefined;
};
