export type CashBookEntryType = "receipt" | "payment";

export type CashBookAccount = {
  accountId: number;
  accountType: string;
  balance: number;
  code: string;
  id: string;
  name: string;
  openingBalance: number;
};

export type CashBookRegisterLine = {
  accountCode: string;
  accountId: number;
  accountName: string;
  balance: number;
  credit: number;
  debit: number;
  description: string;
  entryDate: string;
  entryNumber: string;
  id: string;
  journalId: string;
};

export type CashBookRegister = {
  accounts: CashBookAccount[];
  closingBalance: number;
  lines: CashBookRegisterLine[];
  openingBalance: number;
};

export type CashBookEntryPayload = {
  accountId: string;
  amount: number;
  companyId: number;
  counterpartAccountId: string;
  description: string;
  entryDate: string;
  entryNumber?: string | undefined;
  financialYearId: number;
  reference?: string | undefined;
  type: CashBookEntryType;
};