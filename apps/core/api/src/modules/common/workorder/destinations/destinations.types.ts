export type DestinationsRecord = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type DestinationsSavePayload = {
  name: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type DestinationsListFilters = { search?: string };
