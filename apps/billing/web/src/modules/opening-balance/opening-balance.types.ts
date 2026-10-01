export type OpeningBalanceInput = {
  contactId: number;
  currencyId: number;
  partyRole: "customer" | "supplier";
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
export type OpeningBalanceData = {
  items: OpeningBalance[];
  contacts: Array<{ id: number; name: string; legacyAmount: number }>;
  currencies: Array<{ id: number; name: string }>;
};
