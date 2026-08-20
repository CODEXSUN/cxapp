export type BankBookEntryType = "receipt" | "payment";

export type BankBookAccount = {
  accountId: number;
  accountType: string;
  balance: number;
  code: string;
  id: string;
  name: string;
  openingBalance: number;
};

export type BankBookRegisterLine = {
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

export type BankBookRegister = {
  accounts: BankBookAccount[];
  closingBalance: number;
  lines: BankBookRegisterLine[];
  openingBalance: number;
};

export type BankBookEntryPayload = {
  accountId: string;
  amount: number;
  companyId: number;
  counterpartAccountId: string;
  description: string;
  entryDate: string;
  entryNumber?: string | undefined;
  financialYearId: number;
  reference?: string | undefined;
  type: BankBookEntryType;
};