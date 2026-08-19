export type AccountsOverviewKpi = {
  caption: string;
  title: string;
  value: string;
};

export type AccountsOverview = {
  companyId: number;
  companyName: string;
  financialYearName: string;
  kpis: AccountsOverviewKpi[];
  projectedAt: string;
  status: "ready";
};