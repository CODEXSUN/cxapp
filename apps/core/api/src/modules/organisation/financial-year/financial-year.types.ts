export type FinancialYearStatus = "active" | "inactive";

export type FinancialYearRecord = {
  id: number;
  uuid: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: FinancialYearStatus;
  createdAt: string;
  updatedAt: string;
};

export type FinancialYearSavePayload = {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: FinancialYearStatus;
};

export type FinancialYearListFilters = { search?: string };
