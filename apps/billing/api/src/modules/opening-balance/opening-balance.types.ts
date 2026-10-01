export type OpeningBalanceRole = "customer" | "supplier";
export type OpeningBalanceInput = {
  contactId: number;
  currencyId: number;
  partyRole: OpeningBalanceRole;
  amount: number;
  reason: string;
  assignLegacy: boolean;
};
export type OpeningBalance = OpeningBalanceInput & {
  id: string;
  contactName: string;
  currencyCode: string;
  companyId: number;
  financialYearId: number;
};
