export type BookEntryType = "receipt" | "payment";

export type BookAccount = {
  accountId: number;
  accountType: string;
  balance: number;
  code: string;
  id: string;
  name: string;
  openingBalance: number;
};

export type BookRegisterLine = {
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

export type BookRegister = {
  accounts: BookAccount[];
  closingBalance: number;
  lines: BookRegisterLine[];
  openingBalance: number;
};

export type BookEntryPayload = {
  accountId: string;
  amount: number;
  companyId: number;
  counterpartAccountId: string;
  description: string;
  entryDate: string;
  entryNumber?: string | undefined;
  financialYearId: number;
  reference?: string | undefined;
  type: BookEntryType;
};