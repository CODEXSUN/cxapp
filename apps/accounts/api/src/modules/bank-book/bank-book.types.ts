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
  postedEntryId: string;
  sourceId: string;
  sourceType: "journal" | "cash-book" | "bank-book";
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

export type BankBookEntry = {
  account: BankBookAccount;
  amount: number;
  counterpart: { accountId: number; code: string; id: string; name: string };
  description: string;
  entryDate: string;
  entryNumber: string;
  id: string;
  postedEntryId: string;
  reference: string;
  status: "posted" | "reversed";
  type: BankBookEntryType;
};
