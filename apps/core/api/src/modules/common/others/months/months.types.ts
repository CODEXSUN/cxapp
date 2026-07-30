export type MonthsRecord = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sortOrder: number;
};

export type MonthsSavePayload = {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type MonthsListFilters = { search?: string };
