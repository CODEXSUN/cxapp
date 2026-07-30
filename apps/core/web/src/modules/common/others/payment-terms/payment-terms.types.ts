export type PaymentTermsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type PaymentTermsSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type PaymentTermsListFilters = { search?: string };
