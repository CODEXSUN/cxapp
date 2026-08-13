export type DefaultCompanyStatus = "active" | "inactive";

export type DefaultCompanyRecord = {
  id: number;
  companyId: number;
  companyCode: string;
  companyName: string;
  financialYearId: number;
  financialYearName: string;
  financialYearStartDate: string;
  financialYearEndDate: string;
  landingApp: string;
  status: DefaultCompanyStatus;
  createdAt: string;
  updatedAt: string;
};

export type DefaultCompanySavePayload = {
  companyId: number;
  financialYearId: number;
  landingApp: string;
  status?: DefaultCompanyStatus;
};

export type DefaultCompanyLookup = { id: number; label: string; code?: string };

export type ApplicationCompanyBranding = {
  brandName: string;
  companyId: number;
  legalName: string | null;
  logoDarkPath: string | null;
  logoPath: string | null;
  name: string;
  updatedAt: string;
};
