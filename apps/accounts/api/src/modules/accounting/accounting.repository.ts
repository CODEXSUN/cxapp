import { randomUUID } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getAccountsDatabase, type AccountsDatabase } from "../../database/accounts-database.js";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import type {
  Account,
  AccountContext,
  AccountGroup,
  AccountGroupSavePayload,
  AccountSavePayload,
  AccountingPeriod,
  AccountingPeriodSavePayload,
  JournalEntry,
  JournalLine,
  JournalSavePayload,
  LedgerLine,
  LedgerView
} from "./accounting.types.js";

export class AccountingRepository {
  async context(databaseName: string): Promise<AccountContext | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{
      company_id: number;
      company_name: string;
      financial_year_id: number;
      financial_year_name: string;
    }>`
      SELECT c.id AS company_id,
             c.name AS company_name,
             f.id AS financial_year_id,
             f.name AS financial_year_name
      FROM core_companies c
      CROSS JOIN core_financial_years f
      WHERE c.id=${scope.companyId} AND c.status='active'
        AND f.id=${scope.financialYearId} AND f.status='active'
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row
      ? {
          companyId: row.company_id,
          companyName: row.company_name,
          currencyCode: "INR",
          financialYearId: row.financial_year_id,
          financialYearName: row.financial_year_name
        }
      : null;
  }

  // ---- Account groups ----

  async listGroups(databaseName: string): Promise<AccountGroup[]> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<GroupRow>`
      SELECT id, uuid, company_id, financial_year_id, parent_id, code, name, normal_balance,
             is_system, status, created_at, updated_at, deleted_at
      FROM accounts_account_groups
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
      ORDER BY code
    `.execute(database);
    return result.rows.map(toGroup);
  }

  async getGroup(databaseName: string, uuid: string): Promise<AccountGroup | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<GroupRow>`
      SELECT id, uuid, company_id, financial_year_id, parent_id, code, name, normal_balance,
             is_system, status, created_at, updated_at, deleted_at
      FROM accounts_account_groups
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? toGroup(row) : null;
  }

  async findByGroupCode(
    databaseName: string,
    code: string,
    excludeUuid?: string
  ): Promise<string | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM accounts_account_groups
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND code=${code} AND deleted_at IS NULL
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async hasAccountsUnderGroup(databaseName: string, groupId: number): Promise<boolean> {
    const database = await getAccountsDatabase(databaseName);
    const result = await sql<{ count: string | number }>`
      SELECT COUNT(*) AS count FROM accounts_accounts WHERE group_id=${groupId} AND deleted_at IS NULL
    `.execute(database);
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  async createGroup(databaseName: string, input: AccountGroupSavePayload): Promise<AccountGroup> {
    const database = await getAccountsDatabase(databaseName);
    const uuid = publicUuid();
    await sql`
      INSERT INTO accounts_account_groups
        (uuid, company_id, financial_year_id, parent_id, code, name, normal_balance, is_system, status, created_by)
      VALUES
        (${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.parentId}, ${input.code},
         ${input.name}, ${input.normalBalance}, FALSE, ${input.status}, ${currentAccountsScope().actorEmail || "system:accounts"})
    `.execute(database);
    return (await this.getGroup(databaseName, uuid))!;
  }

  async updateGroup(
    databaseName: string,
    uuid: string,
    input: AccountGroupSavePayload
  ): Promise<AccountGroup | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ id: number }>`
      UPDATE accounts_account_groups SET
        parent_id=${input.parentId}, code=${input.code}, name=${input.name},
        normal_balance=${input.normalBalance}, status=${input.status}, updated_by=${currentAccountsScope().actorEmail || "system:accounts"}
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
    `.execute(database);
    if (result.rows && result.rows.length === 0) return null;
    return this.getGroup(databaseName, uuid);
  }

  async softDeleteGroup(databaseName: string, uuid: string): Promise<boolean> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql`
      UPDATE accounts_account_groups SET deleted_at=CURRENT_TIMESTAMP(3)
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
    `.execute(database);
    return Boolean(result.rows);
  }

  // ---- Accounts ----

  async listAccounts(databaseName: string): Promise<Account[]> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<AccountRow>`
      SELECT a.id, a.uuid, a.company_id, a.financial_year_id, a.group_id, a.code, a.name,
             a.account_type, a.normal_balance, a.is_group, a.is_system, a.is_postable,
             a.is_cash, a.is_bank,
             a.opening_balance, a.currency_code, a.description, a.status, a.created_at, a.updated_at,
             a.deleted_at, COALESCE(g.name,'') AS group_name
      FROM accounts_accounts a
      LEFT JOIN accounts_account_groups g ON g.id=a.group_id
      WHERE a.company_id=${scope.companyId} AND a.financial_year_id=${scope.financialYearId}
        AND a.deleted_at IS NULL
      ORDER BY a.code
    `.execute(database);
    return result.rows.map(toAccount);
  }

  async getAccount(databaseName: string, uuid: string): Promise<Account | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<AccountRow>`
      SELECT a.id, a.uuid, a.company_id, a.financial_year_id, a.group_id, a.code, a.name,
             a.account_type, a.normal_balance, a.is_group, a.is_system, a.is_postable,
             a.is_cash, a.is_bank,
             a.opening_balance, a.currency_code, a.description, a.status, a.created_at, a.updated_at,
             a.deleted_at, COALESCE(g.name,'') AS group_name
      FROM accounts_accounts a
      LEFT JOIN accounts_account_groups g ON g.id=a.group_id
      WHERE a.uuid=${uuid} AND a.company_id=${scope.companyId} AND a.financial_year_id=${scope.financialYearId}
        AND a.deleted_at IS NULL
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? toAccount(row) : null;
  }

  async findByAccountCode(
    databaseName: string,
    code: string,
    excludeUuid?: string
  ): Promise<string | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM accounts_accounts
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND code=${code} AND deleted_at IS NULL
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async resolveAccountId(databaseName: string, uuid: string): Promise<number | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ id: number }>`
      SELECT id FROM accounts_accounts
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? Number(row.id) : null;
  }

  async accountHasActivity(databaseName: string, accountId: number): Promise<boolean> {
    const database = await getAccountsDatabase(databaseName);
    const result = await sql<{ count: string | number }>`
      SELECT COUNT(*) AS count FROM accounts_entry_lines WHERE account_id=${accountId}
    `.execute(database);
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  async createAccount(databaseName: string, input: AccountSavePayload): Promise<Account> {
    const database = await getAccountsDatabase(databaseName);
    const uuid = publicUuid();
    await sql`
      INSERT INTO accounts_accounts
        (uuid, company_id, financial_year_id, group_id, code, name, account_type, normal_balance,
         is_group, is_system, is_postable, opening_balance, currency_code, description, status, created_by,
         is_cash, is_bank)
      VALUES
        (${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.groupId}, ${input.code},
         ${input.name}, ${input.accountType}, ${input.normalBalance}, ${input.isGroup ?? false},
         FALSE, ${input.isPostable ?? true}, ${input.openingBalance ?? 0},
         ${input.currencyCode ?? "INR"}, ${input.description ?? ""}, ${input.status}, ${currentAccountsScope().actorEmail || "system:accounts"},
         ${input.isCash ?? false}, ${input.isBank ?? false})
    `.execute(database);
    return (await this.getAccount(databaseName, uuid))!;
  }

  async updateAccount(
    databaseName: string,
    uuid: string,
    input: AccountSavePayload
  ): Promise<Account | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    await sql`
      UPDATE accounts_accounts SET
        group_id=${input.groupId}, code=${input.code}, name=${input.name},
        account_type=${input.accountType}, normal_balance=${input.normalBalance},
        is_group=${input.isGroup ?? false}, is_postable=${input.isPostable ?? true},
        is_cash=${input.isCash ?? false}, is_bank=${input.isBank ?? false},
        opening_balance=${input.openingBalance ?? 0}, currency_code=${input.currencyCode ?? "INR"},
        description=${input.description ?? ""}, status=${input.status}, updated_by=${currentAccountsScope().actorEmail || "system:accounts"}
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
    `.execute(database);
    return this.getAccount(databaseName, uuid);
  }

  async setAccountStatus(
    databaseName: string,
    uuid: string,
    status: "active" | "inactive"
  ): Promise<Account | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    await sql`
      UPDATE accounts_accounts SET status=${status}, updated_by=${currentAccountsScope().actorEmail || "system:accounts"}
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL
    `.execute(database);
    return this.getAccount(databaseName, uuid);
  }

  // ---- Journals ----

  async listJournals(databaseName: string): Promise<JournalEntry[]> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<JournalRow>`
      SELECT j.id, j.uuid, j.company_id, j.financial_year_id, j.accounting_period_id, j.line_number,
             j.entry_number, j.entry_date, j.reference, j.description, j.status, j.posted_by,
             j.posted_at, j.reversed_by, j.reversed_at, j.reversal_of_id, j.cancellation_reason,
             j.created_at, j.updated_at, j.deleted_at, COALESCE(p.name,'') AS accounting_period_name
      FROM accounts_journal_entries j
      LEFT JOIN accounts_accounting_periods p ON p.id=j.accounting_period_id
      WHERE j.company_id=${scope.companyId} AND j.financial_year_id=${scope.financialYearId}
        AND j.deleted_at IS NULL AND j.source_type='journal'
      ORDER BY j.entry_date DESC, j.line_number DESC
    `.execute(database);
    return this.hydrateJournals(database, result.rows);
  }

  async listJournalsPage(
    databaseName: string,
    options: { page: number; pageSize: number; search: string; status: string }
  ): Promise<{ items: JournalEntry[]; page: number; pageSize: number; total: number }> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const search = `%${options.search.trim()}%`;
    const status = options.status;
    const offset = (options.page - 1) * options.pageSize;
    const [result, countResult] = await Promise.all([
      sql<JournalRow>`
        SELECT j.id, j.uuid, j.company_id, j.financial_year_id, j.accounting_period_id, j.line_number,
               j.entry_number, j.entry_date, j.reference, j.description, j.status, j.posted_by,
               j.posted_at, j.reversed_by, j.reversed_at, j.reversal_of_id, j.cancellation_reason,
               j.created_at, j.updated_at, j.deleted_at, COALESCE(p.name,'') AS accounting_period_name
        FROM accounts_journal_entries j
        LEFT JOIN accounts_accounting_periods p ON p.id=j.accounting_period_id
        WHERE j.company_id=${scope.companyId} AND j.financial_year_id=${scope.financialYearId}
          AND j.deleted_at IS NULL AND j.source_type='journal'
          AND (${status} = 'all' OR j.status = ${status})
          AND (
            ${search} = '%%' OR j.entry_number LIKE ${search} OR j.reference LIKE ${search}
            OR j.description LIKE ${search}
            OR DATE_FORMAT(j.entry_date, '%Y-%m-%d') LIKE ${search}
            OR j.status LIKE ${search}
          )
        ORDER BY j.entry_date DESC, j.line_number DESC
        LIMIT ${options.pageSize} OFFSET ${offset}
      `.execute(database),
      sql<{ total: string | number }>`
        SELECT COUNT(*) AS total
        FROM accounts_journal_entries j
        WHERE j.company_id=${scope.companyId} AND j.financial_year_id=${scope.financialYearId}
          AND j.deleted_at IS NULL AND j.source_type='journal'
          AND (${status} = 'all' OR j.status = ${status})
          AND (
            ${search} = '%%' OR j.entry_number LIKE ${search} OR j.reference LIKE ${search}
            OR j.description LIKE ${search}
            OR DATE_FORMAT(j.entry_date, '%Y-%m-%d') LIKE ${search}
            OR j.status LIKE ${search}
          )
      `.execute(database)
    ]);
    return {
      items: await this.hydrateJournals(database, result.rows),
      page: options.page,
      pageSize: options.pageSize,
      total: Number(countResult.rows[0]?.total ?? 0)
    };
  }

  async getJournal(databaseName: string, uuid: string): Promise<JournalEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<JournalRow>`
      SELECT j.id, j.uuid, j.company_id, j.financial_year_id, j.accounting_period_id, j.line_number,
             j.entry_number, j.entry_date, j.reference, j.description, j.status, j.posted_by,
             j.posted_at, j.reversed_by, j.reversed_at, j.reversal_of_id, j.cancellation_reason,
             j.created_at, j.updated_at, j.deleted_at, COALESCE(p.name,'') AS accounting_period_name
      FROM accounts_journal_entries j
      LEFT JOIN accounts_accounting_periods p ON p.id=j.accounting_period_id
      WHERE j.uuid=${uuid} AND j.company_id=${scope.companyId} AND j.financial_year_id=${scope.financialYearId}
        AND j.deleted_at IS NULL AND j.source_type='journal'
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? (await this.hydrateJournals(database, [row]))[0]! : null;
  }

  async findJournalByNumber(
    databaseName: string,
    entryNumber: string,
    excludeUuid?: string
  ): Promise<string | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ uuid: string }>`
      SELECT uuid FROM accounts_journal_entries
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND entry_number=${entryNumber} AND deleted_at IS NULL AND source_type='journal'
        ${excludeUuid ? sql`AND uuid <> ${excludeUuid}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0]?.uuid ?? null;
  }

  async nextJournalNumber(databaseName: string): Promise<string> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ next_number: number | string }>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number, 4) AS UNSIGNED)), 0) + 1 AS next_number
      FROM accounts_journal_entries
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND entry_number LIKE 'JV-%' AND deleted_at IS NULL AND source_type='journal'
    `.execute(database);
    return `JV-${String(Number(result.rows[0]?.next_number ?? 1)).padStart(6, "0")}`;
  }

  async nextLineNumber(databaseName: string): Promise<number> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ line_number: string | number }>`
      SELECT COALESCE(MAX(line_number), 0) + 1 AS line_number
      FROM accounts_journal_entries
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    `.execute(database);
    return Number(result.rows[0]?.line_number ?? 1);
  }

  async createJournal(
    databaseName: string,
    input: JournalSavePayload,
    lines: JournalLine[]
  ): Promise<JournalEntry> {
    const database = await getAccountsDatabase(databaseName);
    const uuid = publicUuid();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await database.transaction().execute(async (transaction) => {
          const lineResult = await sql<{ line_number: number | string }>`
            SELECT COALESCE(MAX(line_number), 0) + 1 AS line_number
            FROM accounts_journal_entries
            WHERE company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
            FOR UPDATE
          `.execute(transaction);
          const lineNumber = Number(lineResult.rows[0]?.line_number ?? 1);
          const inserted = await sql`
        INSERT INTO accounts_journal_entries
          (uuid, company_id, financial_year_id, accounting_period_id, line_number, entry_number,
           entry_date, reference, description, status, created_by)
        VALUES
          (${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.accountingPeriodId},
           ${lineNumber}, ${input.entryNumber ?? ""}, ${input.entryDate}, ${input.reference ?? ""},
           ${input.description ?? ""}, ${input.status}, ${currentAccountsScope().actorEmail || "system:accounts"})
          `.execute(transaction);
          const journalId = Number(inserted.insertId);
          await insertJournalLines(transaction, journalId, lines);
        });
        return (await this.getJournal(databaseName, uuid))!;
      } catch (error) {
        if (attempt < 4 && isDuplicateKey(error, "accounts_journal_entries_line_unique")) continue;
        throw error;
      }
    }
    throw AppError.conflict("A journal entry number could not be reserved.");
  }

  async updateJournal(
    databaseName: string,
    uuid: string,
    input: JournalSavePayload,
    lines: JournalLine[]
  ): Promise<JournalEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const existing = await sql<{ id: number; uuid: string }>`
      SELECT id, uuid FROM accounts_journal_entries
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND source_type='journal'
      LIMIT 1
    `.execute(database);
    const entry = existing.rows[0];
    if (!entry) return null;
    await database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE accounts_journal_entries SET
          accounting_period_id=${input.accountingPeriodId}, entry_date=${input.entryDate},
          reference=${input.reference ?? ""}, description=${input.description ?? ""},
           status=${input.status}, updated_by=${currentAccountsScope().actorEmail || "system:accounts"}, updated_at=CURRENT_TIMESTAMP(3)
        WHERE id=${entry.id}
      `.execute(transaction);
      await sql`DELETE FROM accounts_journal_lines WHERE journal_entry_id=${entry.id}`.execute(
        transaction
      );
      await insertJournalLines(transaction, entry.id, lines);
    });
    return this.getJournal(databaseName, uuid);
  }

  async setJournalStatus(
    databaseName: string,
    uuid: string,
    status: JournalEntry["status"],
    patch: {
      postedBy?: string;
      postedAt?: boolean;
      reversedBy?: string;
      reversedAt?: boolean;
      cancellationReason?: string;
    } = {}
  ): Promise<JournalEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    await sql`
      UPDATE accounts_journal_entries SET
        status=${status},
        posted_by=COALESCE(${patch.postedBy ?? null}, posted_by),
        posted_at=${patch.postedAt ? sql`CURRENT_TIMESTAMP(3)` : sql`posted_at`},
        reversed_by=COALESCE(${patch.reversedBy ?? null}, reversed_by),
        reversed_at=${patch.reversedAt ? sql`CURRENT_TIMESTAMP(3)` : sql`reversed_at`},
        cancellation_reason=COALESCE(${patch.cancellationReason ?? null}, cancellation_reason),
        updated_by=${currentAccountsScope().actorEmail || "system:accounts"}, updated_at=CURRENT_TIMESTAMP(3)
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND source_type='journal'
    `.execute(database);
    if (status === "reversed") {
      await sql`
        UPDATE accounts_entries e
        INNER JOIN accounts_journal_entries j ON j.posted_entry_id=e.id
        SET e.status='reversed', e.updated_at=CURRENT_TIMESTAMP(3)
        WHERE j.uuid=${uuid} AND e.source_type='journal'
      `.execute(database);
    }
    return this.getJournal(databaseName, uuid);
  }

  async linkJournalReversal(databaseName: string, reversalUuid: string, originalUuid: string) {
    const database = await getAccountsDatabase(databaseName);
    await sql`
      UPDATE accounts_entries reversal
      INNER JOIN accounts_journal_entries reversal_source ON reversal_source.posted_entry_id=reversal.id
      INNER JOIN accounts_journal_entries original_source ON original_source.uuid=${originalUuid}
      SET reversal.reversal_of_id=original_source.posted_entry_id
      WHERE reversal_source.uuid=${reversalUuid} AND reversal.source_type='journal'
    `.execute(database);
  }

  async softDeleteJournal(databaseName: string, uuid: string): Promise<boolean> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    await sql`
      UPDATE accounts_journal_entries SET deleted_at=CURRENT_TIMESTAMP(3)
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND source_type='journal'
    `.execute(database);
    return true;
  }

  async journalHasActivity(databaseName: string, journalId: number): Promise<boolean> {
    const database = await getAccountsDatabase(databaseName);
    const result = await sql<{ count: string | number }>`
      SELECT COUNT(*) AS count
      FROM accounts_entries e
      INNER JOIN accounts_journal_entries j ON j.uuid=e.source_uuid
      WHERE e.source_type='journal' AND j.id=${journalId}
    `.execute(database);
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  async postJournal(
    databaseName: string,
    uuid: string,
    actor: string
  ): Promise<JournalEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const posted = await database.transaction().execute(async (transaction) => {
      const journalResult = await sql<{ id: number; uuid: string }>`
        SELECT id, uuid FROM accounts_journal_entries
        WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
          AND deleted_at IS NULL AND source_type='journal' AND status='ready_to_post'
        FOR UPDATE
      `.execute(transaction);
      const entry = journalResult.rows[0];
      if (!entry) return false;
      const linesResult = await sql<LineRow>`
        SELECT id, account_id, debit, credit FROM accounts_journal_lines
        WHERE journal_entry_id=${entry.id} ORDER BY line_number
      `.execute(transaction);
      if (linesResult.rows.length === 0) return false;
      const central = await sql`
        INSERT INTO accounts_entries
          (uuid, company_id, financial_year_id, accounting_period_id, source_type, source_uuid,
           entry_number, entry_date, reference, description, status, posted_by, posted_at, created_by)
        SELECT ${publicUuid()}, j.company_id, j.financial_year_id, j.accounting_period_id, 'journal',
               j.uuid, j.entry_number, j.entry_date, j.reference, j.description, 'posted', ${actor},
               CURRENT_TIMESTAMP(3), ${actor}
        FROM accounts_journal_entries j WHERE j.id=${entry.id}
      `.execute(transaction);
      const centralEntryId = Number(central.insertId);
      for (const [index, line] of linesResult.rows.entries()) {
        await sql`
          INSERT INTO accounts_entry_lines
            (uuid, entry_id, line_number, account_id, debit, credit, base_debit, base_credit,
             currency_code, description, created_by)
          SELECT ${publicUuid()}, ${centralEntryId}, ${index + 1}, l.account_id, l.debit, l.credit,
                 l.base_debit, l.base_credit, l.currency_code, l.description, ${actor}
          FROM accounts_journal_lines l WHERE l.id=${line.id}
        `.execute(transaction);
      }
      await sql`
        UPDATE accounts_journal_entries SET status='posted', posted_by=${actor},
          posted_at=CURRENT_TIMESTAMP(3), posted_entry_id=${centralEntryId}, updated_by=${actor},
          updated_at=CURRENT_TIMESTAMP(3)
        WHERE id=${entry.id}
      `.execute(transaction);
      return true;
    });
    if (!posted) return null;
    return this.getJournal(databaseName, uuid);
  }

  // ---- Ledger ----

  async ledgerForAccount(databaseName: string, accountUuid: string): Promise<LedgerView | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const accountResult = await sql<AccountRow>`
      SELECT a.id, a.uuid, a.company_id, a.financial_year_id, a.group_id, a.code, a.name,
             a.account_type, a.normal_balance, a.is_group, a.is_system, a.is_postable,
             a.opening_balance, a.currency_code, a.description, a.status, a.created_at, a.updated_at,
             a.deleted_at, COALESCE(g.name,'') AS group_name
      FROM accounts_accounts a
      LEFT JOIN accounts_account_groups g ON g.id=a.group_id
      WHERE a.uuid=${accountUuid} AND a.company_id=${scope.companyId} AND a.financial_year_id=${scope.financialYearId}
        AND a.deleted_at IS NULL AND a.is_group=0
      LIMIT 1
    `.execute(database);
    const account = accountResult.rows[0];
    if (!account) return null;

    const linesResult = await sql<LedgerRow>`
      SELECT l.id, l.uuid, l.account_id, e.entry_date, l.debit, l.credit,
             e.entry_number, e.source_uuid AS journal_uuid, a.code AS account_code, a.name AS account_name
      FROM accounts_entry_lines l
      INNER JOIN accounts_entries e ON e.id=l.entry_id
      INNER JOIN accounts_accounts a ON a.id=l.account_id
      WHERE e.company_id=${scope.companyId} AND e.financial_year_id=${scope.financialYearId}
        AND l.account_id=${account.id}
      ORDER BY e.entry_date, l.id
    `.execute(database);

    const lines: LedgerLine[] = [];
    let running = Number(account.opening_balance);
    const linesMap = linesResult.rows.map((row) => {
      const debit = money(row.debit);
      const credit = money(row.credit);
      running = roundMoney(running + debit - credit);
      return { row, debit, credit, balance: running };
    });
    for (const { row, debit, credit, balance } of linesMap) {
      lines.push({
        accountCode: row.account_code,
        accountId: row.account_id,
        accountName: row.account_name,
        balance,
        credit,
        debit,
        entryDate: row.entry_date,
        entryNumber: row.entry_number,
        id: row.uuid,
        journalId: row.journal_uuid
      });
    }

    return {
      account: {
        accountType: account.account_type,
        balance: running,
        code: account.code,
        id: account.uuid,
        name: account.name,
        normalBalance: account.normal_balance,
        openingBalance: money(account.opening_balance)
      },
      closingBalance: running,
      lines
    };
  }

  // ---- Periods ----

  async listPeriods(databaseName: string): Promise<AccountingPeriod[]> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<PeriodRow>`
      SELECT id, uuid, company_id, financial_year_id, name, DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
             DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date, status, is_system, created_at, updated_at
      FROM accounts_accounting_periods
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      ORDER BY start_date, name
    `.execute(database);
    return result.rows.map(toPeriod);
  }

  async getPeriod(databaseName: string, uuid: string): Promise<AccountingPeriod | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<PeriodRow>`
      SELECT id, uuid, company_id, financial_year_id, name, DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
             DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date, status, is_system, created_at, updated_at
      FROM accounts_accounting_periods
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? toPeriod(row) : null;
  }

  async createPeriod(
    databaseName: string,
    input: AccountingPeriodSavePayload
  ): Promise<AccountingPeriod> {
    const database = await getAccountsDatabase(databaseName);
    const uuid = publicUuid();
    await sql`
      INSERT INTO accounts_accounting_periods
        (uuid, company_id, financial_year_id, name, start_date, end_date, status, is_system, created_by)
      VALUES
        (${uuid}, ${input.companyId}, ${input.financialYearId}, ${input.name}, ${input.startDate},
         ${input.endDate}, ${input.status}, FALSE, ${currentAccountsScope().actorEmail || "system:accounts"})
    `.execute(database);
    return (await this.getPeriod(databaseName, uuid))!;
  }

  async updatePeriodStatus(
    databaseName: string,
    uuid: string,
    status: AccountingPeriod["status"]
  ): Promise<AccountingPeriod | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    await sql`
      UPDATE accounts_accounting_periods SET status=${status}, updated_by=${currentAccountsScope().actorEmail || "system:accounts"}
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    `.execute(database);
    return this.getPeriod(databaseName, uuid);
  }

  async periodForDate(databaseName: string, entryDate: string): Promise<AccountingPeriod | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<PeriodRow>`
      SELECT id, uuid, company_id, financial_year_id, name, DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
             DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date, status, is_system, created_at, updated_at
      FROM accounts_accounting_periods
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND ${entryDate} BETWEEN start_date AND end_date AND status <> 'locked'
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? toPeriod(row) : null;
  }

  async postableAccountIds(databaseName: string, ids: number[]): Promise<Set<number>> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    if (ids.length === 0) return new Set();
    const result = await sql<{ id: number }>`
      SELECT id FROM accounts_accounts
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND id IN (${sql.join(ids)}) AND status='active' AND deleted_at IS NULL AND is_group=0 AND is_postable=1
    `.execute(database);
    return new Set(result.rows.map((row) => Number(row.id)));
  }

  async accountNames(
    databaseName: string,
    ids: number[]
  ): Promise<Map<number, { code: string; name: string }>> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    if (ids.length === 0) return new Map();
    const result = await sql<{ id: number; code: string; name: string }>`
      SELECT id, code, name FROM accounts_accounts
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND id IN (${sql.join(ids)})
    `.execute(database);
    return new Map(result.rows.map((row) => [Number(row.id), { code: row.code, name: row.name }]));
  }

  private async hydrateJournals(
    database: Kysely<AccountsDatabase>,
    rows: JournalRow[]
  ): Promise<JournalEntry[]> {
    if (rows.length === 0) return [];
    const journalIds = rows.map((row) => row.id);
    const linesResult = await sql<LineRow>`
      SELECT l.id, l.uuid, l.journal_entry_id, l.line_number, l.account_id, l.debit, l.credit, l.description,
             a.code AS account_code, a.name AS account_name
      FROM accounts_journal_lines l
      INNER JOIN accounts_accounts a ON a.id=l.account_id
      WHERE l.journal_entry_id IN (${sql.join(journalIds)})
      ORDER BY l.journal_entry_id, l.line_number
    `.execute(database);
    const linesByJournal = new Map<number, JournalLine[]>();
    for (const line of linesResult.rows) {
      const lines = linesByJournal.get(line.journal_entry_id) ?? [];
      lines.push({
        accountCode: line.account_code,
        accountId: line.account_id,
        accountName: line.account_name,
        credit: money(line.credit),
        debit: money(line.debit),
        description: line.description ?? "",
        id: line.uuid,
        lineNumber: line.line_number
      });
      linesByJournal.set(line.journal_entry_id, lines);
    }
    return rows.map((row) => {
      const lines = linesByJournal.get(row.id) ?? [];
      const totalDebit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));
      const totalCredit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));
      return {
        accountingPeriodId: row.accounting_period_id,
        accountingPeriodName: row.accounting_period_name,
        companyId: row.company_id,
        createdAt: row.created_at,
        deleted: Boolean(row.deleted_at),
        description: row.description ?? "",
        entryDate: row.entry_date,
        entryNumber: row.entry_number,
        financialYearId: row.financial_year_id,
        id: row.uuid,
        lineNumber: row.line_number,
        lines,
        reference: row.reference ?? "",
        status: row.status,
        totalCredit,
        totalDebit,
        updatedAt: row.updated_at
      };
    });
  }
}

async function insertJournalLines(
  transaction: Kysely<AccountsDatabase>,
  journalId: number,
  lines: JournalLine[]
) {
  for (const [index, line] of lines.entries()) {
    await sql`
      INSERT INTO accounts_journal_lines
        (uuid, journal_entry_id, line_number, account_id, debit, credit, base_debit, base_credit,
         currency_code, description)
      VALUES
        (${publicUuid()}, ${journalId}, ${index + 1}, ${line.accountId}, ${line.debit}, ${line.credit},
         ${line.debit}, ${line.credit}, 'INR', ${line.description ?? ""})
    `.execute(transaction);
  }
}

type GroupRow = {
  code: string;
  company_id: number;
  created_at: string;
  deleted_at: string | null;
  financial_year_id: number;
  id: number;
  is_system: number | boolean;
  name: string;
  normal_balance: "debit" | "credit";
  parent_id: number | null;
  status: string;
  updated_at: string;
  uuid: string;
};

type AccountRow = {
  account_type: Account["accountType"];
  code: string;
  company_id: number;
  created_at: string;
  currency_code: string;
  deleted_at: string | null;
  description: string | null;
  financial_year_id: number;
  group_id: number | null;
  group_name: string;
  id: number;
  is_bank: number | boolean;
  is_cash: number | boolean;
  is_group: number | boolean;
  is_postable: number | boolean;
  is_system: number | boolean;
  name: string;
  normal_balance: "debit" | "credit";
  opening_balance: string | number;
  status: string;
  updated_at: string;
  uuid: string;
};

type JournalRow = {
  accounting_period_id: number | null;
  accounting_period_name: string;
  cancellation_reason: string | null;
  company_id: number;
  created_at: string;
  deleted_at: string | null;
  description: string | null;
  entry_date: string;
  entry_number: string;
  financial_year_id: number;
  id: number;
  line_number: number;
  posted_at: string | null;
  posted_by: string | null;
  reference: string | null;
  reversal_of_id: number | null;
  reversed_at: string | null;
  reversed_by: string | null;
  status: JournalEntry["status"];
  updated_at: string;
  uuid: string;
};

type LineRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  credit: string | number;
  debit: string | number;
  description: string | null;
  id: number;
  journal_entry_id: number;
  line_number: number;
  uuid: string;
};

type LedgerRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  credit: string | number;
  debit: string | number;
  entry_date: string;
  entry_number: string;
  id: number;
  journal_uuid: string;
  uuid: string;
};

type PeriodRow = {
  company_id: number;
  created_at: string;
  end_date: string;
  financial_year_id: number;
  id: number;
  is_system: number | boolean;
  name: string;
  start_date: string;
  status: AccountingPeriod["status"];
  updated_at: string;
  uuid: string;
};

function toGroup(row: GroupRow): AccountGroup {
  return {
    code: row.code,
    companyId: row.company_id,
    createdAt: row.created_at,
    deleted: Boolean(row.deleted_at),
    financialYearId: row.financial_year_id,
    id: row.uuid,
    isSystem: Boolean(row.is_system),
    name: row.name,
    normalBalance: row.normal_balance,
    parentId: row.parent_id,
    status: row.status as AccountGroup["status"],
    updatedAt: row.updated_at
  };
}

function toAccount(row: AccountRow): Account {
  return {
    accountId: Number(row.id),
    accountType: row.account_type,
    code: row.code,
    companyId: row.company_id,
    createdAt: row.created_at,
    currencyCode: row.currency_code,
    deleted: Boolean(row.deleted_at),
    description: row.description ?? "",
    financialYearId: row.financial_year_id,
    groupId: row.group_id,
    groupName: row.group_name,
    id: row.uuid,
    isBank: Boolean(row.is_bank),
    isCash: Boolean(row.is_cash),
    isGroup: Boolean(row.is_group),
    isPostable: Boolean(row.is_postable),
    isSystem: Boolean(row.is_system),
    name: row.name,
    normalBalance: row.normal_balance,
    openingBalance: money(row.opening_balance),
    status: row.status as Account["status"],
    updatedAt: row.updated_at
  };
}

function toPeriod(row: PeriodRow): AccountingPeriod {
  return {
    companyId: row.company_id,
    createdAt: row.created_at,
    endDate: row.end_date,
    financialYearId: row.financial_year_id,
    id: row.uuid,
    isSystem: Boolean(row.is_system),
    name: row.name,
    periodId: Number(row.id),
    startDate: row.start_date,
    status: row.status,
    updatedAt: row.updated_at
  };
}

export function money(value: unknown) {
  return Math.round((Number(value ?? 0) || 0) * 100) / 100;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function publicUuid() {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}

function isDuplicateKey(error: unknown, constraint: string) {
  const value = error as { code?: string; sqlMessage?: string; message?: string };
  const legacyConstraint = constraint.replace(/^accounts_/, "acc_");
  const message = `${value.sqlMessage ?? ""} ${value.message ?? ""}`;
  return (
    value.code === "ER_DUP_ENTRY" &&
    (message.includes(constraint) || message.includes(legacyConstraint))
  );
}
