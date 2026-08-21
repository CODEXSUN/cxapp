import {
  accountsApiDelete,
  accountsApiGet,
  accountsApiPatch,
  accountsApiPost,
  accountsApiPut
} from "../../shared/api/accounts-api";
import type {
  Account,
  AccountGroup,
  AccountGroupSavePayload,
  AccountingPeriod,
  AccountSavePayload,
  AccountContext,
  BookEntryPayload,
  BookEntry,
  BookRegister,
  CashBookContext,
  CashBookLedger,
  CashBookLedgerGroup,
  CashBookLedgerSavePayload,
  JournalEntry,
  JournalPageResult,
  JournalSavePayload,
  LedgerView
} from "./accounting.types";

export function getAccountingContext() {
  return accountsApiGet<AccountContext>("/accounts/context");
}

export function listAccountGroups() {
  return accountsApiGet<AccountGroup[]>("/accounts/groups");
}

export function createAccountGroup(payload: AccountGroupSavePayload) {
  return accountsApiPost<AccountGroup>("/accounts/groups", toGroupPayload(payload));
}

export function createCoreLedgerGroup(payload: { name: string; status: "active" | "inactive" }) {
  return accountsApiPost<{ id: number; name: string; status: "active" | "inactive" }>(
    "/core/common/accounts/ledger-groups",
    payload
  );
}

export function updateAccountGroup(id: string, payload: AccountGroupSavePayload) {
  return accountsApiPut<AccountGroup>(`/accounts/groups/${id}`, toGroupPayload(payload));
}

export function deleteAccountGroup(id: string) {
  return accountsApiDelete<AccountGroup>(`/accounts/groups/${id}`);
}

export function listAccounts() {
  return accountsApiGet<Account[]>("/accounts");
}

export function getAccount(id: string) {
  return accountsApiGet<Account>(`/accounts/${id}`);
}

export function createAccount(payload: AccountSavePayload) {
  return accountsApiPost<Account>("/accounts", toAccountPayload(payload));
}

export function updateAccount(id: string, payload: AccountSavePayload) {
  return accountsApiPut<Account>(`/accounts/${id}`, toAccountPayload(payload));
}

export function setAccountStatus(id: string, status: "active" | "inactive") {
  return accountsApiPatch<Account>(`/accounts/${id}/status`, { status });
}

export function deleteAccount(id: string) {
  return accountsApiDelete<Account>(`/accounts/${id}`);
}

export function listJournalsPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search,
    status: query.status
  });
  return accountsApiGet<JournalPageResult>(`/accounts/journals/page?${params}`);
}

export function getJournal(id: string) {
  return accountsApiGet<JournalEntry>(`/accounts/journals/${id}`);
}

export function createJournal(payload: JournalSavePayload) {
  return accountsApiPost<JournalEntry>("/accounts/journals", toJournalPayload(payload));
}

export function updateJournal(id: string, payload: JournalSavePayload) {
  return accountsApiPut<JournalEntry>(`/accounts/journals/${id}`, toJournalPayload(payload));
}

export function submitJournal(id: string) {
  return accountsApiPost<JournalEntry>(`/accounts/journals/${id}/submit`);
}

export function postJournal(id: string) {
  return accountsApiPost<JournalEntry>(`/accounts/journals/${id}/post`);
}

export function reverseJournal(id: string) {
  return accountsApiPost<JournalEntry>(`/accounts/journals/${id}/reverse`);
}

export function cancelJournal(id: string, reason: string) {
  return accountsApiPost<JournalEntry>(`/accounts/journals/${id}/cancel`, { reason });
}

export function deleteJournal(id: string) {
  return accountsApiDelete<JournalEntry>(`/accounts/journals/${id}`);
}

export function getLedger(accountId: string) {
  return accountsApiGet<LedgerView>(`/accounts/ledger/${accountId}`);
}

export function listPeriods() {
  return accountsApiGet<AccountingPeriod[]>("/accounts/periods");
}

export function setPeriodStatus(id: string, status: AccountingPeriod["status"]) {
  return accountsApiPatch<AccountingPeriod>(`/accounts/periods/${id}/status`, { status });
}

export function getBookRegister(kind: "cash" | "bank") {
  return accountsApiGet<BookRegister>(`/${kind}-book`);
}

export function postBookEntry(kind: "cash" | "bank", payload: BookEntryPayload) {
  return accountsApiPost<BookEntry>(`/${kind}-book/entries`, {
    companyId: payload.companyId,
    description: payload.description,
    entryDate: payload.entryDate,
    entryNumber: payload.entryNumber ?? "",
    financialYearId: payload.financialYearId,
    reference: payload.reference ?? "",
    type: payload.type,
    ...(kind === "cash"
      ? {
          cashLedgerId: payload.cashLedgerId,
          lines: payload.cashLines
        }
      : {
          accountId: payload.accountId,
          amount: payload.amount,
          counterpartAccountId: payload.counterpartAccountId
        })
  });
}

export function listCashBookLedgers() {
  return accountsApiGet<CashBookLedger[]>("/cash-book/ledgers");
}

export function getCashBookContext() {
  return accountsApiGet<CashBookContext>("/cash-book/context");
}

export function listCashBookLedgerGroups() {
  return accountsApiGet<CashBookLedgerGroup[]>("/cash-book/ledger-groups");
}

export function createCashBookLedger(payload: CashBookLedgerSavePayload) {
  return accountsApiPost<CashBookLedger>("/cash-book/ledgers", payload);
}

export function getBookEntry(kind: "cash" | "bank", id: string) {
  return accountsApiGet<BookEntry>(`/${kind}-book/entries/${id}`);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(Number(value ?? 0));
}

export function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function journalToPayload(journal: JournalEntry): JournalSavePayload {
  return {
    accountingPeriodId: journal.accountingPeriodId,
    companyId: journal.companyId,
    description: journal.description,
    entryDate: journal.entryDate,
    entryNumber: journal.entryNumber,
    financialYearId: journal.financialYearId,
    lines: journal.lines.map((line) => ({
      accountId: line.accountId,
      credit: line.credit,
      debit: line.debit,
      description: line.description ?? ""
    })),
    reference: journal.reference,
    status: journal.status === "posted" ? "ready_to_post" : "draft"
  };
}

function toGroupPayload(payload: AccountGroupSavePayload) {
  return {
    code: payload.code,
    companyId: payload.companyId,
    financialYearId: payload.financialYearId,
    name: payload.name,
    normalBalance: payload.normalBalance,
    parentId: payload.parentId,
    status: payload.status
  };
}

function toAccountPayload(payload: AccountSavePayload) {
  return {
    accountType: payload.accountType,
    code: payload.code,
    companyId: payload.companyId,
    currencyCode: payload.currencyCode ?? "INR",
    description: payload.description ?? "",
    financialYearId: payload.financialYearId,
    groupId: payload.groupId,
    isBank: payload.isBank ?? false,
    isCash: payload.isCash ?? false,
    isGroup: payload.isGroup ?? false,
    isPostable: payload.isPostable ?? !payload.isGroup,
    name: payload.name,
    normalBalance: payload.normalBalance,
    openingBalance: payload.openingBalance ?? 0,
    status: payload.status
  };
}

function toJournalPayload(payload: JournalSavePayload) {
  return {
    accountingPeriodId: payload.accountingPeriodId,
    companyId: payload.companyId,
    description: payload.description ?? "",
    entryDate: payload.entryDate,
    entryNumber: payload.entryNumber ?? "",
    financialYearId: payload.financialYearId,
    lines: payload.lines.map((line) => ({
      accountId: line.accountId,
      credit: line.credit,
      debit: line.debit,
      description: line.description ?? ""
    })),
    reference: payload.reference ?? "",
    status: payload.status
  };
}
