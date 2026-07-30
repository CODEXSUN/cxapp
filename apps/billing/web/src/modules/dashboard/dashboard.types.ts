export type DashboardKind = "payment" | "purchase" | "receipt" | "sales";
export type DashboardMetric = {
  count: number;
  financialYear: number;
  month: number;
  total: number;
};
export type DashboardMonth = {
  label: string;
  month: string;
  payment: number;
  purchase: number;
  receipt: number;
  sales: number;
};
export type DashboardRecent = {
  amount: number;
  contactName: string;
  date: string;
  documentId: string;
  documentNumber: string;
  kind: DashboardKind | "export-sales";
  status: string;
};
export type DashboardOutstanding = {
  contactId: number;
  contactName: string;
  creditLimit: number;
  direction: "payable" | "receivable";
  grossAmount: number;
  outstandingAmount: number;
  overLimit: boolean;
  settledAmount: number;
};
export type BillingDashboard = {
  companyId: number;
  companyName: string;
  financialYearEnd: string;
  financialYearId: number;
  financialYearName: string;
  financialYearStart: string;
  metrics: Record<DashboardKind, DashboardMetric>;
  monthly: DashboardMonth[];
  outstanding: DashboardOutstanding[];
  projectedAt: string;
  projectionVersion: number;
  recent: DashboardRecent[];
};
