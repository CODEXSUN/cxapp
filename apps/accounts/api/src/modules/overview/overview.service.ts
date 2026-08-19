import type { AccountsOverview } from "./overview.types.js";

type OverviewInput = {
  companyId: number;
  financialYearId: number;
};

export const overviewService = {
  get(input: OverviewInput): AccountsOverview {
    return {
      companyId: input.companyId,
      companyName: "Accounts scaffold",
      financialYearName: `Financial year ${input.financialYearId}`,
      kpis: [
        { caption: "Ledger groups configured", title: "Ledger Groups", value: "0" },
        { caption: "Ledger accounts created", title: "Ledgers", value: "0" },
        { caption: "Current financial year", title: "Accounting Year", value: "Active" }
      ],
      projectedAt: new Date().toISOString(),
      status: "ready"
    };
  }
};