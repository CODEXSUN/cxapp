import { AppError } from "@cxapp/framework/errors";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { AccountingRepository, money, roundMoney } from "./accounting.repository.js";
import type {
  AccountGroupSavePayload,
  AccountSavePayload,
  AccountingPeriod,
  AccountingPeriodSavePayload,
  JournalEntry,
  JournalLine,
  JournalLineInput,
  JournalSavePayload,
  LedgerView
} from "./accounting.types.js";

export class AccountingService {
  constructor(private readonly repository = new AccountingRepository()) {}

  async getContext(databaseName: string) {
    const context = await this.repository.context(databaseName);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before using Accounts."
      );
    }
    return context;
  }

  // ---- Account groups ----

  listGroups(databaseName: string) {
    return this.repository.listGroups(databaseName);
  }

  getGroup(databaseName: string, id: string) {
    return this.repository.getGroup(databaseName, id);
  }

  async createGroup(databaseName: string, input: AccountGroupSavePayload) {
    const normalized = normalizeGroupInput(input);
    await this.assertGroupCodeAvailable(databaseName, normalized.code);
    await this.assertGroupParent(databaseName, normalized.parentId);
    return this.repository.createGroup(databaseName, normalized);
  }

  async updateGroup(databaseName: string, id: string, input: AccountGroupSavePayload) {
    const current = await this.repository.getGroup(databaseName, id);
    if (!current) return null;
    if (current.isSystem) throw AppError.conflict("System ledger groups cannot be edited.");
    const normalized = normalizeGroupInput(input);
    await this.assertGroupCodeAvailable(databaseName, normalized.code, id);
    await this.assertGroupParent(databaseName, normalized.parentId);
    return this.repository.updateGroup(databaseName, id, normalized);
  }

  async deleteGroup(databaseName: string, id: string) {
    const current = await this.repository.getGroup(databaseName, id);
    if (!current) return null;
    if (current.isSystem) throw AppError.conflict("System ledger groups cannot be deleted.");
    if (current.parentId === null && current.code.length <= 4)
      throw AppError.conflict("Top-level ledger groups cannot be deleted.");
    await this.repository.softDeleteGroup(databaseName, id);
    return current;
  }

  // ---- Accounts ----

  listAccounts(databaseName: string) {
    return this.repository.listAccounts(databaseName);
  }

  getAccount(databaseName: string, id: string) {
    return this.repository.getAccount(databaseName, id);
  }

  async createAccount(databaseName: string, input: AccountSavePayload) {
    const normalized = normalizeAccountInput(input);
    await this.assertAccountCodeAvailable(databaseName, normalized.code);
    await this.assertAccountGroup(databaseName, normalized.groupId);
    return this.repository.createAccount(databaseName, normalized);
  }

  async updateAccount(databaseName: string, id: string, input: AccountSavePayload) {
    const current = await this.repository.getAccount(databaseName, id);
    if (!current) return null;
    const normalized = normalizeAccountInput(input);
    await this.assertAccountCodeAvailable(databaseName, normalized.code, id);
    await this.assertAccountGroup(databaseName, normalized.groupId);
    return this.repository.updateAccount(databaseName, id, normalized);
  }

  async setAccountStatus(databaseName: string, id: string, status: "active" | "inactive") {
    const current = await this.repository.getAccount(databaseName, id);
    if (!current) return null;
    if (status === "inactive") {
      const accountId = await this.resolveAccountId(databaseName, id);
      if (accountId && (await this.repository.accountHasActivity(databaseName, accountId)))
        throw AppError.conflict("Accounts with posted activity cannot be deactivated.");
    }
    return this.repository.setAccountStatus(databaseName, id, status);
  }

  async deleteAccount(databaseName: string, id: string) {
    const current = await this.repository.getAccount(databaseName, id);
    if (!current) return null;
    if (current.isSystem) throw AppError.conflict("System accounts cannot be deleted.");
    const accountId = await this.resolveAccountId(databaseName, id);
    if (accountId && (await this.repository.accountHasActivity(databaseName, accountId)))
      throw AppError.conflict("Accounts with posted activity cannot be deleted.");
    await this.repository.setAccountStatus(databaseName, id, "inactive");
    return current;
  }

  // ---- Journals ----

  listJournals(databaseName: string) {
    return this.repository.listJournals(databaseName);
  }

  listJournalsPage(
    databaseName: string,
    query: { page: number; pageSize: number; search: string; status: string }
  ) {
    return this.repository.listJournalsPage(databaseName, query);
  }

  getJournal(databaseName: string, id: string) {
    return this.repository.getJournal(databaseName, id);
  }

  async createJournal(databaseName: string, input: JournalSavePayload) {
    const { normalized, lines } = await this.prepareJournal(databaseName, input);
    const journal = await this.repository.createJournal(databaseName, normalized, lines);
    await this.project(databaseName, "created", journal);
    return journal;
  }

  async updateJournal(databaseName: string, id: string, input: JournalSavePayload) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status !== "draft")
      throw AppError.conflict("Only draft journal entries can be edited.");
    const { normalized, lines } = await this.prepareJournal(databaseName, input, id);
    const journal = await this.repository.updateJournal(databaseName, id, normalized, lines);
    if (journal) await this.project(databaseName, "updated", journal);
    return journal;
  }

  async submitJournal(databaseName: string, id: string) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status === "posted" || current.status === "reversed")
      throw AppError.conflict("Posted journal entries cannot be re-submitted.");
    if (current.status === "cancelled")
      throw AppError.conflict("Cancelled journal entries cannot be submitted.");
    const lines = this.buildLines(current.lines);
    assertDoubleEntryTotals(lines);
    await this.assertPeriod(databaseName, current.entryDate);
    const journal = await this.repository.setJournalStatus(databaseName, id, "ready_to_post");
    if (journal) await this.project(databaseName, "submitted", journal);
    return journal;
  }

  async postJournal(databaseName: string, id: string, actor: string) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status !== "ready_to_post")
      throw AppError.conflict("Only ready-to-post journal entries can be posted.");
    await this.assertPeriod(databaseName, current.entryDate);
    await this.assertPostableAccounts(databaseName, current.lines);
    const journal = await this.repository.postJournal(databaseName, id, actor);
    if (journal) await this.project(databaseName, "posted", journal);
    return journal;
  }

  async reverseJournal(databaseName: string, id: string, actor: string) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status !== "posted")
      throw AppError.conflict("Only posted journal entries can be reversed.");
    await this.assertPeriod(databaseName, current.entryDate);
    const reversal = await this.createReversal(databaseName, current, actor);
    await this.project(databaseName, "reversed", reversal);
    return reversal;
  }

  async cancelJournal(databaseName: string, id: string, reason: string) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status === "posted" || current.status === "reversed")
      throw AppError.conflict("Posted journal entries cannot be cancelled; reverse them instead.");
    if (current.status === "cancelled") return current;
    const journal = await this.repository.setJournalStatus(databaseName, id, "cancelled", {
      cancellationReason: reason
    });
    if (journal) await this.project(databaseName, "cancelled", journal);
    return journal;
  }

  async deleteJournal(databaseName: string, id: string) {
    const current = await this.repository.getJournal(databaseName, id);
    if (!current) return null;
    if (current.status !== "draft")
      throw AppError.conflict("Only draft journal entries can be deleted.");
    await this.repository.softDeleteJournal(databaseName, id);
    await this.project(databaseName, "deleted", current);
    return current;
  }

  // ---- Ledger ----

  ledgerForAccount(databaseName: string, accountId: string): Promise<LedgerView | null> {
    return this.repository.ledgerForAccount(databaseName, accountId);
  }

  // ---- Periods ----

  listPeriods(databaseName: string) {
    return this.repository.listPeriods(databaseName);
  }

  getPeriod(databaseName: string, id: string) {
    return this.repository.getPeriod(databaseName, id);
  }

  async createPeriod(databaseName: string, input: AccountingPeriodSavePayload) {
    const normalized = normalizePeriodInput(input);
    if (normalized.startDate > normalized.endDate)
      throw AppError.validation("Period start date must be on or before the end date.");
    return this.repository.createPeriod(databaseName, normalized);
  }

  async setPeriodStatus(databaseName: string, id: string, status: AccountingPeriod["status"]) {
    const current = await this.repository.getPeriod(databaseName, id);
    if (!current) return null;
    if (current.isSystem && status !== "open")
      throw AppError.conflict("The system Annual period cannot be closed or locked.");
    return this.repository.updatePeriodStatus(databaseName, id, status);
  }

  // ---- Internals ----

  private async prepareJournal(
    databaseName: string,
    input: JournalSavePayload,
    excludeUuid?: string
  ) {
    const normalized = normalizeJournalInput(input);
    await this.assertEntryNumberAvailable(databaseName, normalized.entryNumber ?? "", excludeUuid);
    const lines = this.buildLines(normalized.lines);
    const totals = assertDoubleEntryTotals(lines);
    await this.assertPostableAccounts(databaseName, lines);
    await this.assertPeriod(databaseName, normalized.entryDate, normalized.accountingPeriodId);
    if (normalized.accountingPeriodId) {
      await this.assertPeriodMatchesDate(databaseName, normalized.accountingPeriodId, normalized.entryDate);
    }
    return { normalized, lines, totals };
  }

  private buildLines(lines: JournalLineInput[]): JournalLine[] {
    return lines
      .map((line, index) => {
        const debit = money(line.debit);
        const credit = money(line.credit);
        const full = line as Partial<JournalLine>;
        return {
          accountCode: full.accountCode ?? "",
          accountId: line.accountId,
          accountName: full.accountName ?? "",
          credit,
          debit,
          description: line.description?.trim() ?? "",
          id: full.id ?? "",
          lineNumber: index + 1
        };
      })
      .filter((line) => line.debit !== 0 || line.credit !== 0);
  }

  private async assertEntryNumberAvailable(databaseName: string, entryNumber: string, excludeUuid?: string) {
    const duplicate = await this.repository.findJournalByNumber(databaseName, entryNumber, excludeUuid);
    if (duplicate) throw AppError.conflict(`Journal entry ${entryNumber} is already used.`);
  }

  private async assertGroupCodeAvailable(databaseName: string, code: string, excludeUuid?: string) {
    const duplicate = await this.repository.findByGroupCode(databaseName, code, excludeUuid);
    if (duplicate) throw AppError.conflict(`Ledger group code ${code} is already used.`);
  }

  private async assertGroupParent(databaseName: string, parentId: number | null) {
    if (parentId === null) return;
    const groups = await this.repository.listGroups(databaseName);
    const parent = groups.find((group) => group.id === String(parentId));
    if (!parent) throw AppError.validation("The parent ledger group is inactive or missing.");
  }

  private async assertAccountCodeAvailable(databaseName: string, code: string, excludeUuid?: string) {
    const duplicate = await this.repository.findByAccountCode(databaseName, code, excludeUuid);
    if (duplicate) throw AppError.conflict(`Account code ${code} is already used.`);
  }

  private async assertAccountGroup(databaseName: string, groupId: number | null) {
    if (groupId === null) return;
    const groups = await this.repository.listGroups(databaseName);
    const group = groups.find((item) => item.id === String(groupId));
    if (!group) throw AppError.validation("The selected ledger group is inactive or missing.");
  }

  private async resolveAccountId(databaseName: string, uuid: string) {
    return this.repository.resolveAccountId(databaseName, uuid);
  }

  private async assertPostableAccounts(databaseName: string, lines: JournalLine[]) {
    const accountIds = Array.from(new Set(lines.map((line) => line.accountId).filter(Boolean)));
    if (accountIds.length === 0)
      throw AppError.validation("Add at least one journal line with a persisted account.");
    const postable = await this.repository.postableAccountIds(databaseName, accountIds);
    const missing = accountIds.filter((id) => !postable.has(id));
    if (missing.length > 0)
      throw AppError.validation("Every journal line requires an active, postable ledger account.");
  }

  private async assertPeriod(
    databaseName: string,
    entryDate: string,
    requestedPeriodId?: number | null
  ) {
    const period = await this.repository.periodForDate(databaseName, entryDate);
    if (!period)
      throw AppError.validation("The entry date does not fall within an open accounting period.");
    if (requestedPeriodId && Number(requestedPeriodId) !== 0 && Number(requestedPeriodId) !== Number(period.id))
      throw AppError.validation("The selected accounting period does not cover the entry date.");
  }

  private async assertPeriodMatchesDate(databaseName: string, periodId: number, entryDate: string) {
    const period = await this.repository.getPeriod(databaseName, String(periodId));
    if (!period) throw AppError.validation("The selected accounting period is missing.");
    if (period.status === "locked")
      throw AppError.conflict("The selected accounting period is locked.");
    if (entryDate < period.startDate || entryDate > period.endDate)
      throw AppError.validation("The entry date is outside the selected accounting period.");
  }

  private async createReversal(databaseName: string, original: JournalEntry, actor: string) {
    const scope = currentAccountsScope();
    const entryNumber = `RV-${original.entryNumber}`;
    const duplicate = await this.repository.findJournalByNumber(databaseName, entryNumber);
    if (duplicate)
      throw AppError.conflict(`A reversal for ${original.entryNumber} already exists.`);
    const input: JournalSavePayload = {
      accountingPeriodId: original.accountingPeriodId,
      companyId: scope.companyId,
      description: `Reversal of ${original.entryNumber}`,
      entryDate: new Date().toISOString().slice(0, 10),
      entryNumber,
      financialYearId: scope.financialYearId,
      lines: original.lines.map((line) => ({
        accountId: line.accountId,
        credit: line.debit,
        debit: line.credit,
        description: `Reversal of ${original.entryNumber} line ${line.lineNumber}`
      })),
      status: "ready_to_post"
    };
    const reversal = await this.repository.createJournal(
      databaseName,
      { ...input, entryNumber },
      input.lines.map((line, index) => ({
        accountCode: "",
        accountId: line.accountId,
        accountName: "",
        credit: line.credit,
        debit: line.debit,
        description: line.description ?? "",
        id: "",
        lineNumber: index + 1
      }))
    );
    await this.repository.setJournalStatus(databaseName, reversal.id, "ready_to_post", {
      postedBy: actor
    });
    const posted = await this.repository.postJournal(databaseName, reversal.id, actor);
    return posted ?? reversal;
  }

  private project(
    databaseName: string,
    action: string,
    journal: Pick<JournalEntry, "companyId" | "financialYearId" | "id">
  ) {
    return this.repository
      .context(databaseName)
      .then(() => journal)
      .catch(() => journal);
  }
}

export function assertDoubleEntry(
  totals: { debit: number; credit: number },
  lines: JournalLine[]
) {
  const balance = roundMoney(totals.debit - totals.credit);
  if (Math.abs(balance) > 0.001)
    throw AppError.validation("Journal entries must balance: total debits must equal total credits.");
  if (lines.length < 2)
    throw AppError.validation("A journal entry requires at least two lines.");
}

function assertDoubleEntryTotals(lines: JournalLine[]) {
  const debit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));
  if (lines.length < 2) {
    throw AppError.validation("A journal entry requires at least two lines.");
  }
  if (Math.abs(roundMoney(debit - credit)) > 0.001)
    throw AppError.validation("Journal entries must balance: total debits must equal total credits.");
  return { debit, credit };
}

function normalizeGroupInput(input: AccountGroupSavePayload): AccountGroupSavePayload {
  if (!Number.isInteger(input.companyId) || input.companyId <= 0)
    throw AppError.validation("Default Company is required.");
  if (!Number.isInteger(input.financialYearId) || input.financialYearId <= 0)
    throw AppError.validation("Financial Year is required.");
  if (!input.code.trim()) throw AppError.validation("Group code is required.");
  if (!input.name.trim()) throw AppError.validation("Group name is required.");
  return {
    code: input.code.trim().toUpperCase(),
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    name: input.name.trim(),
    normalBalance: input.normalBalance,
    parentId: positiveOrNull(input.parentId),
    status: input.status === "inactive" ? "inactive" : "active"
  };
}

function normalizeAccountInput(input: AccountSavePayload): AccountSavePayload {
  if (!Number.isInteger(input.companyId) || input.companyId <= 0)
    throw AppError.validation("Default Company is required.");
  if (!Number.isInteger(input.financialYearId) || input.financialYearId <= 0)
    throw AppError.validation("Financial Year is required.");
  if (!input.code.trim()) throw AppError.validation("Account code is required.");
  if (!input.name.trim()) throw AppError.validation("Account name is required.");
  return {
    accountType: input.accountType,
    code: input.code.trim().toUpperCase(),
    companyId: input.companyId,
    currencyCode: input.currencyCode?.trim().toUpperCase() || "INR",
    description: input.description?.trim() ?? "",
    financialYearId: input.financialYearId,
    groupId: positiveOrNull(input.groupId),
    isBank: Boolean(input.isBank),
    isCash: Boolean(input.isCash),
    isGroup: Boolean(input.isGroup),
    isPostable: input.isPostable ?? !input.isGroup,
    name: input.name.trim(),
    normalBalance: input.normalBalance,
    openingBalance: money(input.openingBalance ?? 0),
    status: input.status === "inactive" ? "inactive" : "active"
  };
}

function normalizeJournalInput(input: JournalSavePayload): JournalSavePayload {
  if (!Number.isInteger(input.companyId) || input.companyId <= 0)
    throw AppError.validation("Default Company is required.");
  if (!Number.isInteger(input.financialYearId) || input.financialYearId <= 0)
    throw AppError.validation("Financial Year is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate.trim()))
    throw AppError.validation("Entry date is required.");
  return {
    accountingPeriodId: positiveOrNull(input.accountingPeriodId),
    companyId: input.companyId,
    description: input.description?.trim() ?? "",
    entryDate: input.entryDate.trim(),
    entryNumber: input.entryNumber?.trim().toUpperCase() || "",
    financialYearId: input.financialYearId,
    lines: input.lines.map((line) => ({
      accountId: Number(line.accountId),
      credit: money(line.credit),
      debit: money(line.debit),
      description: line.description?.trim() ?? ""
    })),
    reference: input.reference?.trim() ?? "",
    status: input.status
  };
}

function normalizePeriodInput(input: AccountingPeriodSavePayload): AccountingPeriodSavePayload {
  if (!Number.isInteger(input.companyId) || input.companyId <= 0)
    throw AppError.validation("Default Company is required.");
  if (!Number.isInteger(input.financialYearId) || input.financialYearId <= 0)
    throw AppError.validation("Financial Year is required.");
  if (!input.name.trim()) throw AppError.validation("Period name is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate.trim()) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate.trim()))
    throw AppError.validation("Period dates are required.");
  return {
    companyId: input.companyId,
    endDate: input.endDate.trim(),
    financialYearId: input.financialYearId,
    name: input.name.trim(),
    startDate: input.startDate.trim(),
    status: input.status
  };
}

function positiveOrNull(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isInteger(number) && number > 0 ? number : null;
}
