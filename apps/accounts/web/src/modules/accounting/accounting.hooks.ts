import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import { getCompanyId, getFinancialYearId } from "../../shared/api/tenant-context";
import {
  getAccountingContext,
  getBookRegister,
  getCashBookContext,
  getJournal,
  getLedger,
  listCashBookLedgers,
  listCashBookLedgerGroups,
  listAccountGroups,
  listAccounts,
  listJournalsPage,
  listPeriods
} from "./accounting.services";
import type { BookRegister, JournalPageResult } from "./accounting.types";

export function useAccountingContext() {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(companyId && financialYearId),
    queryFn: getAccountingContext,
    queryKey: ["accounts", "accounting", "context", companyId, financialYearId]
  });
}

export function useAccountGroups() {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(companyId && financialYearId),
    queryFn: listAccountGroups,
    queryKey: ["accounts", "accounting", "groups", companyId, financialYearId]
  });
}

export function useAccounts() {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(companyId && financialYearId),
    queryFn: listAccounts,
    queryKey: ["accounts", "accounting", "accounts", companyId, financialYearId]
  });
}

export function useJournalsPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<JournalPageResult>({
    enabled: Boolean(companyId && financialYearId),
    placeholderData: (previous) => previous,
    queryFn: () => listJournalsPage(request),
    queryKey: ["accounts", "accounting", "journals", "page", companyId, financialYearId, request]
  });
}

export function useJournalRecord(id: string | null, enabled = true) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(id) && enabled && Boolean(companyId && financialYearId),
    queryFn: () => getJournal(id!),
    queryKey: ["accounts", "accounting", "journals", companyId, financialYearId, id]
  });
}

export function useLedger(accountId: string | null) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(accountId) && Boolean(companyId && financialYearId),
    queryFn: () => getLedger(accountId!),
    queryKey: ["accounts", "accounting", "ledger", companyId, financialYearId, accountId]
  });
}

export function useAccountingPeriods() {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: Boolean(companyId && financialYearId),
    queryFn: listPeriods,
    queryKey: ["accounts", "accounting", "periods", companyId, financialYearId]
  });
}

export function useBookRegister(kind: "cash" | "bank") {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery<BookRegister>({
    enabled: Boolean(companyId && financialYearId),
    queryFn: () => getBookRegister(kind),
    queryKey: ["accounts", "accounting", "book", kind, companyId, financialYearId]
  });
}

export function useCashBookLedgers(enabled = true) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: enabled && Boolean(companyId && financialYearId),
    queryFn: listCashBookLedgers,
    queryKey: ["accounts", "accounting", "cash-book", "core-ledgers", companyId, financialYearId]
  });
}

export function useCashBookContext(enabled = true) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: enabled && Boolean(companyId && financialYearId),
    queryFn: getCashBookContext,
    queryKey: ["accounts", "accounting", "cash-book", "context", companyId, financialYearId]
  });
}

export function useCashBookLedgerGroups(enabled = true) {
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  return useQuery({
    enabled: enabled && Boolean(companyId && financialYearId),
    queryFn: listCashBookLedgerGroups,
    queryKey: [
      "accounts",
      "accounting",
      "cash-book",
      "core-ledger-groups",
      companyId,
      financialYearId
    ]
  });
}
