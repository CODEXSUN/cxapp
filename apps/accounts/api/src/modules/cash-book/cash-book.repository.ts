import { sql } from "kysely";
import { getAccountsDatabase } from "../../database/accounts-database.js";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { money, roundMoney } from "../accounting/accounting.repository.js";
import type {
  CashBookAccount,
  CashBookRegister,
  CashBookRegisterLine
} from "./cash-book.types.js";

export class CashBookRepository {
  async register(databaseName: string): Promise<CashBookRegister | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();

    const accountResult = await sql<CashBookAccountRow>`
      SELECT a.id, a.uuid, a.code, a.name, a.account_type, a.opening_balance
      FROM acc_accounts a
      WHERE a.company_id=${scope.companyId} AND a.financial_year_id=${scope.financialYearId}
        AND a.deleted_at IS NULL AND a.is_group=0 AND a.is_cash=1
      ORDER BY a.code
    `.execute(database);
    const accounts = accountResult.rows.map(toCashBookAccount);
    if (accounts.length === 0) return null;

    const accountIds = accounts.map((account) => account.accountId);
    const linesResult = await sql<CashBookLedgerRow>`
      SELECT l.id, l.uuid, l.account_id, l.entry_date, l.debit, l.credit,
             j.entry_number, j.uuid AS journal_uuid, a.code AS account_code, a.name AS account_name,
             j.description AS journal_description
      FROM acc_ledger l
      INNER JOIN acc_journal_entries j ON j.id=l.journal_entry_id
      INNER JOIN acc_accounts a ON a.id=l.account_id
      WHERE l.company_id=${scope.companyId} AND l.financial_year_id=${scope.financialYearId}
        AND l.account_id IN (${sql.join(accountIds)})
      ORDER BY l.entry_date, l.id
    `.execute(database);

    const openingBalance = roundMoney(
      accounts.reduce((sum, account) => sum + account.openingBalance, 0)
    );
    const lines: CashBookRegisterLine[] = [];
    let running = openingBalance;
    for (const row of linesResult.rows) {
      const debit = money(row.debit);
      const credit = money(row.credit);
      running = roundMoney(running + debit - credit);
      lines.push({
        accountCode: row.account_code,
        accountId: row.account_id,
        accountName: row.account_name,
        balance: running,
        credit,
        debit,
        description: row.journal_description ?? "",
        entryDate: row.entry_date,
        entryNumber: row.entry_number,
        id: row.uuid,
        journalId: row.journal_uuid
      });
    }

    return {
      accounts,
      closingBalance: running,
      lines,
      openingBalance
    };
  }

  async findCashAccount(databaseName: string, uuid: string) {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<CashBookAccountRow>`
      SELECT a.id, a.uuid, a.code, a.name, a.account_type, a.opening_balance
      FROM acc_accounts a
      WHERE a.uuid=${uuid} AND a.company_id=${scope.companyId} AND a.financial_year_id=${scope.financialYearId}
        AND a.deleted_at IS NULL AND a.is_group=0 AND a.is_cash=1
      LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    return row ? toCashBookAccount(row) : null;
  }

  async nextEntryNumber(databaseName: string): Promise<string> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ line_number: string | number }>`
      SELECT MAX(line_number) AS line_number FROM acc_journal_entries
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    `.execute(database);
    const next = Number(result.rows[0]?.line_number ?? 0) + 1;
    return `CR-${String(next).padStart(5, "0")}`;
  }
}

type CashBookAccountRow = {
  account_type: string;
  code: string;
  id: number;
  name: string;
  opening_balance: string | number;
  uuid: string;
};

type CashBookLedgerRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  credit: string | number;
  debit: string | number;
  entry_date: string;
  entry_number: string;
  id: number;
  journal_description: string | null;
  journal_uuid: string;
  uuid: string;
};

function toCashBookAccount(row: CashBookAccountRow): CashBookAccount {
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