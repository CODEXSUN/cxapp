export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type NormalBalance = "debit" | "credit";
export type JournalStatus = "draft" | "ready_to_post" | "posted" | "cancelled" | "reversed";
export type PeriodStatus = "open" | "closed" | "locked";
export type RecordStatus = "active" | "inactive";

export type AccountContext = {
  companyId: number;
  companyName: string;
  currencyCode: string;
  financialYearId: number;
  financialYearName: string;
};

export type AccountGroup = {
  code: string;
  companyId: number;
  createdAt: string;
  deleted: boolean;
  financialYearId: number;
  id: string;
  isSystem: boolean;
  name: string;
  normalBalance: NormalBalance;
  parentId: number | null;
  status: RecordStatus;
  updatedAt: string;
};

export type AccountGroupSavePayload = {
  code: string;
  companyId: number;
  financialYearId: number;
  name: string;
  normalBalance: NormalBalance;
  parentId: number | null;
  status: RecordStatus;
};

export type Account = {
  accountId: number;
  accountType: AccountType;
  code: string;
  companyId: number;
  createdAt: string;
  currencyCode: string;
  deleted: boolean;
  description: string;
  financialYearId: number;
  groupId: number | null;
  groupName: string;
  id: string;
  isBank: boolean;
  isCash: boolean;
  isGroup: boolean;
  isPostable: boolean;
  isSystem: boolean;
  name: string;
  normalBalance: NormalBalance;
  openingBalance: number;
  status: RecordStatus;
  updatedAt: string;
};

export type AccountSavePayload = {
  accountType: AccountType;
  code: string;
  companyId: number;
  currencyCode?: string;
  description?: string;
  financialYearId: number;
  groupId: number | null;
  isBank?: boolean;
  isCash?: boolean;
  isGroup?: boolean;
  isPostable?: boolean;
  name: string;
  normalBalance: NormalBalance;
  openingBalance?: number;
  status: RecordStatus;
};

export type JournalLine = {
  accountCode: string;
  accountId: number;
  accountName: string;
  credit: number;
  debit: number;
  description?: string;
  id: string;
  lineNumber: number;
};

export type JournalEntry = {
  accountingPeriodId: number | null;
  accountingPeriodName: string;
  companyId: number;
  createdAt: string;
  deleted: boolean;
  description: string;
  entryDate: string;
  entryNumber: string;
  financialYearId: number;
  id: string;
  lineNumber: number;
  lines: JournalLine[];
  reference: string;
  status: JournalStatus;
  totalCredit: number;
  totalDebit: number;
  updatedAt: string;
};

export type JournalSavePayload = {
  accountingPeriodId: number | null;
  companyId: number;
  description?: string;
  entryDate: string;
  entryNumber?: string;
  financialYearId: number;
  lines: Array<{ accountId: number; credit: number; debit: number; description?: string }>;
  reference?: string;
  status: "draft" | "ready_to_post";
};

export type JournalPageResult = {
  items: JournalEntry[];
  page: number;
  pageSize: number;
  total: number;
};

export type LedgerLine = {
  accountCode: string;
  accountId: number;
  accountName: string;
  balance: number;
  credit: number;
  debit: number;
  entryDate: string;
  entryNumber: string;
  id: string;
  journalId: string;
};

export type LedgerView = {
  account: {
    accountType: AccountType;
    balance: number;
    code: string;
    id: string;
    name: string;
    normalBalance: NormalBalance;
    openingBalance: number;
  };
  closingBalance: number;
  lines: LedgerLine[];
};

export type AccountingPeriod = {
  companyId: number;
  createdAt: string;
  endDate: string;
  financialYearId: number;
  id: string;
  isSystem: boolean;
  name: string;
  periodId: number;
  startDate: string;
  status: PeriodStatus;
  updatedAt: string;
};

export type AccountingPeriodSavePayload = {
  companyId: number;
  endDate: string;
  financialYearId: number;
  name: string;
  startDate: string;
  status: PeriodStatus;
};

export type BookEntryType = "receipt" | "payment";

export type BookAccount = {
  accountId: number;
  accountType: AccountType;
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
  postedEntryId: string;
  sourceId: string;
  sourceType: "journal" | "cash-book" | "bank-book";
};

export type BookRegister = {
  accounts: BookAccount[];
  closingBalance: number;
  lines: BookRegisterLine[];
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

export type CashBookLedgerGroup = {
  id: number;
  name: string;
  status: RecordStatus;
};

export type CashBookLedgerSavePayload = {
  ledgerGroupId: number;
  name: string;
  status: RecordStatus;
};

export type BookEntryPayload = {
  accountId?: string;
  amount: number;
  cashLedgerId?: number;
  cashLines?: Array<{ amount: number | ""; ledgerId: number }>;
  companyId: number;
  counterpartAccountId?: string;
  description: string;
  entryDate: string;
  entryNumber?: string;
  financialYearId: number;
  reference?: string;
  type: BookEntryType;
};

export type BookEntry = {
  account: BookAccount;
  amount: number;
  cashLedger?: CashBookLedger | null;
  counterpart: { accountId: number; code: string; id: string; name: string };
  counterpartLedger?: CashBookLedger | null;
  description: string;
  entryDate: string;
  entryNumber: string;
  id: string;
  lines?: Array<{
    account: { accountId: number; code: string; id: string; name: string };
    amount: number;
    ledger: CashBookLedger | null;
    lineNumber: number;
  }>;
  postedEntryId: string;
  reference: string;
  status: "posted" | "reversed";
  type: BookEntryType;
};
