export type ContactGroupsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ContactGroupsSavePayload = {
  name?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ContactGroupsListFilters = { search?: string };
