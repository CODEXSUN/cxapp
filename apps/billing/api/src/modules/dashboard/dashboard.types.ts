export type DashboardTransactionKind = "payment" | "purchase" | "receipt" | "sales";

export type DashboardMetric = {
  count: number;
  financialYear: number;
  month: number;
  total: number;
};

export type DashboardMonthlyTotal = {
  label: string;
  month: string;
  payment: number;
  purchase: number;
  receipt: number;
  sales: number;
};

export type DashboardRecentTransaction = {
  amount: number;
  contactName: string;
  date: string;
  documentId: string;
  documentNumber: string;
  kind: DashboardTransactionKind | "export-sales";
  status: string;
};

export type DashboardOutstandingContact = {
  contactId: number;
  contactName: string;
  creditLimit: number;
  direction: "payable" | "receivable";
  grossAmount: number;
  outstandingAmount: number;
  overLimit: boolean;
  settledAmount: number;
};

export type BillingDashboardSnapshot = {
  companyId: number;
  companyName: string;
  financialYearEnd: string;
  financialYearId: number;
  financialYearName: string;
  financialYearStart: string;
  metrics: Record<DashboardTransactionKind, DashboardMetric>;
  monthly: DashboardMonthlyTotal[];
  outstanding: DashboardOutstandingContact[];
  projectedAt: string;
  projectionVersion: number;
  recent: DashboardRecentTransaction[];
};

export type DashboardProjectionSource =
  "export-sales" | "payment" | "purchase" | "receipt" | "sales";

export type DashboardProjectionAction =
  "cancelled" | "confirmed" | "created" | "deleted" | "posted" | "updated";

export type DashboardProjectionRequest = {
  action: DashboardProjectionAction;
  companyId: number;
  documentId: string;
  financialYearId: number;
  source: DashboardProjectionSource;
};
