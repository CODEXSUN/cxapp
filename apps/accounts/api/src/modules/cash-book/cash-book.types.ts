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
  postedEntryId: string;
  sourceId: string;
  sourceType: "journal" | "cash-book" | "bank-book";
};

export type CashBookRegister = {
  accounts: CashBookAccount[];
  closingBalance: number;
  lines: CashBookRegisterLine[];
  openingBalance: number;
};

export type CashBookLedger = {
  groupName: string;
  id: number;
  name: string;
};

export type CashBookContext = {
  rowPosition: number;
  suggestedEntryNumber: string;
};

export type CashBookEntryPayload = {
  cashLedgerId: number;
  companyId: number;
  description: string;
  entryDate: string;
  entryNumber?: string | undefined;
  financialYearId: number;
  lines: Array<{ amount: number | ""; ledgerId: number }>;
  reference?: string | undefined;
  type: CashBookEntryType;
};

export type CashBookEntryLine = {
  account: { accountId: number; code: string; id: string; name: string };
  amount: number;
  ledger: CashBookLedger | null;
  lineNumber: number;
};

export type CashBookEntry = {
  account: CashBookAccount;
  amount: number;
  cashLedger: CashBookLedger | null;
  counterpart: { accountId: number; code: string; id: string; name: string };
  counterpartLedger: CashBookLedger | null;
  description: string;
  entryDate: string;
  entryNumber: string;
  id: string;
  lines: CashBookEntryLine[];
  postedEntryId: string;
  reference: string;
  status: "posted" | "reversed";
  type: CashBookEntryType;
};
