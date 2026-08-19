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
  currencyCode?: string | undefined;
  description?: string | undefined;
  financialYearId: number;
  groupId: number | null;
  isBank?: boolean | undefined;
  isCash?: boolean | undefined;
  isGroup?: boolean | undefined;
  isPostable?: boolean | undefined;
  name: string;
  normalBalance: NormalBalance;
  openingBalance?: number | undefined;
  status: RecordStatus;
};

export type JournalLineInput = {
  accountId: number;
  credit: number;
  debit: number;
  description?: string | undefined;
};

export type JournalLine = JournalLineInput & {
  accountCode: string;
  accountName: string;
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
  description?: string | undefined;
  entryDate: string;
  entryNumber?: string | undefined;
  financialYearId: number;
  lines: JournalLineInput[];
  reference?: string | undefined;
  status: "draft" | "ready_to_post";
};

export type JournalPage = {
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

export type AccountingRule = {
  companyId: number;
  config: Record<string, unknown>;
  createdAt: string;
  description: string;
  id: string;
  isActive: boolean;
  name: string;
  ruleType: string;
  status: RecordStatus;
  updatedAt: string;
};
