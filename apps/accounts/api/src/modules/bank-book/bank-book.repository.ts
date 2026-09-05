import { randomUUID } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getAccountsDatabase, type AccountsDatabase } from "../../database/accounts-database.js";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import type {
  BankBookAccount,
  BankBookEntry,
  BankBookEntryPayload,
  BankBookRegister,
  BankBookRegisterLine
} from "./bank-book.types.js";

export class BankBookRepository {
  async register(databaseName: string): Promise<BankBookRegister | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const accountResult = await sql<BookAccountRow>`
      SELECT id, uuid, code, name, account_type, opening_balance FROM accounts_accounts
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND status='active' AND is_group=0 AND is_bank=1 ORDER BY code
    `.execute(database);
    const accounts = accountResult.rows.map(toAccount);
    if (accounts.length === 0) return null;
    const result = await sql<RegisterRow>`
      SELECT l.uuid, l.account_id, l.debit, l.credit, e.uuid AS posted_entry_uuid,
             e.source_type, e.source_uuid, e.entry_date, e.entry_number, e.description,
             a.code AS account_code, a.name AS account_name
      FROM accounts_entry_lines l
      INNER JOIN accounts_entries e ON e.id=l.entry_id
      INNER JOIN accounts_accounts a ON a.id=l.account_id
      WHERE e.company_id=${scope.companyId} AND e.financial_year_id=${scope.financialYearId}
        AND l.account_id IN (${sql.join(accounts.map((account) => account.accountId))})
      ORDER BY e.entry_date, l.id
    `.execute(database);
    const openingBalance = roundMoney(
      accounts.reduce((sum, account) => sum + account.openingBalance, 0)
    );
    let running = openingBalance;
    const lines: BankBookRegisterLine[] = result.rows.map((row) => {
      const debit = money(row.debit);
      const credit = money(row.credit);
      running = roundMoney(running + debit - credit);
      return {
        accountCode: row.account_code,
        accountId: row.account_id,
        accountName: row.account_name,
        balance: running,
        credit,
        debit,
        description: row.description ?? "",
        entryDate: row.entry_date,
        entryNumber: row.entry_number,
        id: row.uuid,
        postedEntryId: row.posted_entry_uuid,
        sourceId: row.source_uuid,
        sourceType: row.source_type
      };
    });
    return { accounts, closingBalance: running, lines, openingBalance };
  }

  async getEntry(databaseName: string, uuid: string): Promise<BankBookEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<BookEntryRow>`
      SELECT source.uuid, source.entry_number, source.entry_date, source.entry_type, source.amount,
             source.reference, source.description, source.status, entry.uuid AS posted_entry_uuid,
             account.id AS account_id, account.uuid AS account_uuid, account.code AS account_code,
             account.name AS account_name, account.account_type,
             counterpart.id AS counterpart_account_id, counterpart.uuid AS counterpart_uuid,
             counterpart.code AS counterpart_code, counterpart.name AS counterpart_name
      FROM accounts_bank_entries source
      INNER JOIN accounts_entries entry ON entry.id=source.posted_entry_id
      INNER JOIN accounts_accounts account ON account.id=source.account_id
      INNER JOIN accounts_accounts counterpart ON counterpart.id=source.counterpart_account_id
      WHERE source.uuid=${uuid} AND source.company_id=${scope.companyId}
        AND source.financial_year_id=${scope.financialYearId} LIMIT 1
    `.execute(database);
    return result.rows[0] ? toEntry(result.rows[0]) : null;
  }

  async postEntry(databaseName: string, input: BankBookEntryPayload): Promise<BankBookEntry> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const account = await this.findAccount(databaseName, input.accountId, true);
    const counterpart = await this.findAccount(databaseName, input.counterpartAccountId, false);
    if (!account) throw AppError.validation("The selected bank account is invalid or inactive.");
    if (!counterpart)
      throw AppError.validation("The selected counterpart account is invalid or inactive.");
    if (account.accountId === counterpart.accountId)
      throw AppError.validation("Bank and counterpart accounts must be different.");
    const period = await sql<{ id: number }>`
      SELECT id FROM accounts_accounting_periods
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND ${input.entryDate} BETWEEN start_date AND end_date AND status='open'
      ORDER BY start_date DESC LIMIT 1
    `.execute(database);
    if (!period.rows[0])
      throw AppError.validation("The entry date does not fall within an open accounting period.");

    const sourceUuid = publicUuid();
    const actor = scope.actorEmail || "system:bank-book";
    await database.transaction().execute(async (transaction) => {
      const sequence = await sql<{ line_number: number | string }>`
        SELECT COALESCE(MAX(line_number),0)+1 AS line_number FROM accounts_bank_entries
        WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId} FOR UPDATE
      `.execute(transaction);
      const lineNumber = Number(sequence.rows[0]?.line_number ?? 1);
      const entryNumber =
        input.entryNumber?.trim().toUpperCase() || `BR-${String(lineNumber).padStart(6, "0")}`;
      const central = await sql`
        INSERT INTO accounts_entries
          (uuid, company_id, financial_year_id, accounting_period_id, source_type, source_uuid,
           entry_number, entry_date, reference, description, status, posted_by, posted_at, created_by)
        VALUES (${publicUuid()}, ${scope.companyId}, ${scope.financialYearId}, ${period.rows[0]!.id},
          'bank-book', ${sourceUuid}, ${entryNumber}, ${input.entryDate}, ${input.reference?.trim() ?? ""},
          ${input.description.trim()}, 'posted', ${actor}, CURRENT_TIMESTAMP(3), ${actor})
      `.execute(transaction);
      const centralId = Number(central.insertId);
      const isReceipt = input.type === "receipt";
      await insertCentralLine(
        transaction,
        centralId,
        1,
        account.accountId,
        isReceipt ? input.amount : 0,
        isReceipt ? 0 : input.amount,
        input.description,
        actor
      );
      await insertCentralLine(
        transaction,
        centralId,
        2,
        counterpart.accountId,
        isReceipt ? 0 : input.amount,
        isReceipt ? input.amount : 0,
        input.description,
        actor
      );
      await sql`
        INSERT INTO accounts_bank_entries
          (uuid, company_id, financial_year_id, line_number, entry_number, entry_date, entry_type,
           account_id, counterpart_account_id, amount, reference, description, status,
           posted_entry_id, created_by)
        VALUES (${sourceUuid}, ${scope.companyId}, ${scope.financialYearId}, ${lineNumber}, ${entryNumber},
          ${input.entryDate}, ${input.type}, ${account.accountId}, ${counterpart.accountId}, ${input.amount},
          ${input.reference?.trim() ?? ""}, ${input.description.trim()}, 'posted', ${centralId}, ${actor})
      `.execute(transaction);
    });
    return (await this.getEntry(databaseName, sourceUuid))!;
  }

  private async findAccount(databaseName: string, uuid: string, cashOnly: boolean) {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<BookAccountRow>`
      SELECT id, uuid, code, name, account_type, opening_balance FROM accounts_accounts
      WHERE uuid=${uuid} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND status='active' AND is_group=0 AND is_postable=1
        ${cashOnly ? sql`AND is_bank=1` : sql``} LIMIT 1
    `.execute(database);
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }
}

async function insertCentralLine(
  database: Kysely<AccountsDatabase>,
  entryId: number,
  lineNumber: number,
  accountId: number,
  debit: number,
  credit: number,
  description: string,
  actor: string
) {
  await sql`
    INSERT INTO accounts_entry_lines
      (uuid, entry_id, line_number, account_id, debit, credit, base_debit, base_credit,
       currency_code, description, created_by)
    VALUES (${publicUuid()}, ${entryId}, ${lineNumber}, ${accountId}, ${debit}, ${credit}, ${debit},
      ${credit}, 'INR', ${description.trim()}, ${actor})
  `.execute(database);
}

type BookAccountRow = {
  account_type: string;
  code: string;
  id: number;
  name: string;
  opening_balance: string | number;
  uuid: string;
};
type RegisterRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  credit: string | number;
  debit: string | number;
  description: string | null;
  entry_date: string;
  entry_number: string;
  posted_entry_uuid: string;
  source_type: BankBookRegisterLine["sourceType"];
  source_uuid: string;
  uuid: string;
};
type BookEntryRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  account_type: string;
  account_uuid: string;
  amount: string | number;
  counterpart_account_id: number;
  counterpart_code: string;
  counterpart_name: string;
  counterpart_uuid: string;
  description: string;
  entry_date: string;
  entry_number: string;
  entry_type: BankBookEntry["type"];
  posted_entry_uuid: string;
  reference: string | null;
  status: BankBookEntry["status"];
  uuid: string;
};

function toAccount(row: BookAccountRow): BankBookAccount {
  return {
    accountId: Number(row.id),
    accountType: row.account_type,
    balance: 0,
    code: row.code,
    id: row.uuid,
    name: row.name,
    openingBalance: money(row.opening_balance)
  };
}
function toEntry(row: BookEntryRow): BankBookEntry {
  return {
    account: toAccount({
      account_type: row.account_type,
      code: row.account_code,
      id: row.account_id,
      name: row.account_name,
      opening_balance: 0,
      uuid: row.account_uuid
    }),
    amount: money(row.amount),
    counterpart: {
      accountId: row.counterpart_account_id,
      code: row.counterpart_code,
      id: row.counterpart_uuid,
      name: row.counterpart_name
    },
    description: row.description,
    entryDate: row.entry_date,
    entryNumber: row.entry_number,
    id: row.uuid,
    postedEntryId: row.posted_entry_uuid,
    reference: row.reference ?? "",
    status: row.status,
    type: row.entry_type
  };
}
function money(value: unknown) {
  return Math.round((Number(value ?? 0) || 0) * 100) / 100;
}
function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
function publicUuid() {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}
