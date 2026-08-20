import { randomUUID } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { getAccountsDatabase, type AccountsDatabase } from "../../database/accounts-database.js";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import type {
  CashBookAccount,
  CashBookContext,
  CashBookEntry,
  CashBookEntryPayload,
  CashBookLedger,
  CashBookRegister,
  CashBookRegisterLine
} from "./cash-book.types.js";

export class CashBookRepository {
  async context(databaseName: string): Promise<CashBookContext> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<{ row_position: number | string }>`
      SELECT COALESCE(MAX(line_number),0)+1 AS row_position
      FROM acc_cash_entries
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
    `.execute(database);
    const rowPosition = Number(result.rows[0]?.row_position ?? 1);
    return {
      rowPosition,
      suggestedEntryNumber: `CR-${String(rowPosition).padStart(6, "0")}`
    };
  }

  async ledgers(databaseName: string): Promise<CashBookLedger[]> {
    const database = await getAccountsDatabase(databaseName);
    const result = await sql<CoreLedgerRow>`
      SELECT ledger.id, ledger.name, ledger_group.name AS group_name
      FROM core_ledgers ledger
      INNER JOIN core_ledger_groups ledger_group ON ledger_group.id=ledger.ledger_group_id
      WHERE ledger.status='active' AND ledger_group.status='active'
      ORDER BY ledger_group.name, ledger.name
    `.execute(database);
    return result.rows.map(toLedger);
  }

  async register(databaseName: string): Promise<CashBookRegister | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const accountResult = await sql<BookAccountRow>`
      SELECT id, uuid, code, name, account_type, opening_balance FROM acc_accounts
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND deleted_at IS NULL AND status='active' AND is_group=0 AND is_cash=1 ORDER BY code
    `.execute(database);
    const accounts = accountResult.rows.map(toAccount);
    if (accounts.length === 0) return null;
    const result = await sql<RegisterRow>`
      SELECT l.uuid, l.account_id, l.debit, l.credit, e.uuid AS posted_entry_uuid,
             e.source_type, e.source_uuid, e.entry_date, e.entry_number, e.description,
             a.code AS account_code, a.name AS account_name
      FROM acc_entry_lines l
      INNER JOIN acc_entries e ON e.id=l.entry_id
      INNER JOIN acc_accounts a ON a.id=l.account_id
      WHERE e.company_id=${scope.companyId} AND e.financial_year_id=${scope.financialYearId}
        AND l.account_id IN (${sql.join(accounts.map((account) => account.accountId))})
      ORDER BY e.entry_date, l.id
    `.execute(database);
    const openingBalance = roundMoney(
      accounts.reduce((sum, account) => sum + account.openingBalance, 0)
    );
    let running = openingBalance;
    const lines: CashBookRegisterLine[] = result.rows.map((row) => {
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

  async getEntry(databaseName: string, uuid: string): Promise<CashBookEntry | null> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const result = await sql<BookEntryRow>`
      SELECT source.id AS source_id, source.uuid, source.entry_number, source.entry_date, source.entry_type, source.amount,
             source.reference, source.description, source.status, entry.uuid AS posted_entry_uuid,
             account.id AS account_id, account.uuid AS account_uuid, account.code AS account_code,
             account.name AS account_name, account.account_type,
             counterpart.id AS counterpart_account_id, counterpart.uuid AS counterpart_uuid,
             counterpart.code AS counterpart_code, counterpart.name AS counterpart_name,
             cash_ledger.id AS cash_ledger_id, cash_ledger.name AS cash_ledger_name,
             cash_group.name AS cash_ledger_group_name,
             counterpart_ledger.id AS counterpart_ledger_id,
             counterpart_ledger.name AS counterpart_ledger_name,
             counterpart_group.name AS counterpart_ledger_group_name
      FROM acc_cash_entries source
      INNER JOIN acc_entries entry ON entry.id=source.posted_entry_id
      INNER JOIN acc_accounts account ON account.id=source.account_id
      INNER JOIN acc_accounts counterpart ON counterpart.id=source.counterpart_account_id
      LEFT JOIN acc_core_ledger_links cash_link ON cash_link.account_id=account.id
        AND cash_link.company_id=source.company_id
        AND cash_link.financial_year_id=source.financial_year_id
      LEFT JOIN core_ledgers cash_ledger ON cash_ledger.id=cash_link.core_ledger_id
      LEFT JOIN core_ledger_groups cash_group ON cash_group.id=cash_ledger.ledger_group_id
      LEFT JOIN acc_core_ledger_links counterpart_link ON counterpart_link.account_id=counterpart.id
        AND counterpart_link.company_id=source.company_id
        AND counterpart_link.financial_year_id=source.financial_year_id
      LEFT JOIN core_ledgers counterpart_ledger
        ON counterpart_ledger.id=counterpart_link.core_ledger_id
      LEFT JOIN core_ledger_groups counterpart_group
        ON counterpart_group.id=counterpart_ledger.ledger_group_id
      WHERE source.uuid=${uuid} AND source.company_id=${scope.companyId}
        AND source.financial_year_id=${scope.financialYearId} LIMIT 1
    `.execute(database);
    const row = result.rows[0];
    if (!row) return null;
    const entry = toEntry(row);
    const lines = await sql<CashEntryLineRow>`
      SELECT source_line.line_number, source_line.amount,
             account.id AS account_id, account.uuid AS account_uuid,
             account.code AS account_code, account.name AS account_name,
             ledger.id AS ledger_id, ledger.name AS ledger_name,
             ledger_group.name AS ledger_group_name
      FROM acc_cash_entry_lines source_line
      INNER JOIN acc_accounts account ON account.id=source_line.account_id
      LEFT JOIN core_ledgers ledger ON ledger.id=source_line.core_ledger_id
      LEFT JOIN core_ledger_groups ledger_group ON ledger_group.id=ledger.ledger_group_id
      WHERE source_line.cash_entry_id=${row.source_id}
      ORDER BY source_line.line_number
    `.execute(database);
    return { ...entry, lines: lines.rows.map(toEntryLine) };
  }

  async postEntry(
    databaseName: string,
    input: Omit<CashBookEntryPayload, "lines"> & {
      amount: number;
      lines: Array<{ amount: number; ledgerId: number }>;
    }
  ): Promise<CashBookEntry> {
    const database = await getAccountsDatabase(databaseName);
    const scope = currentAccountsScope();
    const period = await sql<{ id: number }>`
      SELECT id FROM acc_accounting_periods
      WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
        AND ${input.entryDate} BETWEEN start_date AND end_date AND status='open'
      ORDER BY start_date DESC LIMIT 1
    `.execute(database);
    if (!period.rows[0])
      throw AppError.validation("The entry date does not fall within an open accounting period.");

    const sourceUuid = publicUuid();
    const actor = scope.actorEmail || "system:cash-book";
    await database.transaction().execute(async (transaction) => {
      const account = await resolveLedgerAccount(transaction, input.cashLedgerId, true, actor);
      const counterpartLines: Array<{
        account: CashBookAccount;
        amount: number;
        ledgerId: number;
      }> = [];
      for (const line of input.lines) {
        counterpartLines.push({
          account: await resolveLedgerAccount(transaction, line.ledgerId, false, actor),
          amount: line.amount,
          ledgerId: line.ledgerId
        });
      }
      const counterpart = counterpartLines[0]!.account;
      const sequence = await sql<{ line_number: number | string }>`
        SELECT COALESCE(MAX(line_number),0)+1 AS line_number FROM acc_cash_entries
        WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId} FOR UPDATE
      `.execute(transaction);
      const lineNumber = Number(sequence.rows[0]?.line_number ?? 1);
      const entryNumber =
        input.entryNumber?.trim().toUpperCase() || `CR-${String(lineNumber).padStart(6, "0")}`;
      const central = await sql`
        INSERT INTO acc_entries
          (uuid, company_id, financial_year_id, accounting_period_id, source_type, source_uuid,
           entry_number, entry_date, reference, description, status, posted_by, posted_at, created_by)
        VALUES (${publicUuid()}, ${scope.companyId}, ${scope.financialYearId}, ${period.rows[0]!.id},
          'cash-book', ${sourceUuid}, ${entryNumber}, ${input.entryDate}, ${input.reference?.trim() ?? ""},
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
      for (const [index, line] of counterpartLines.entries()) {
        await insertCentralLine(
          transaction,
          centralId,
          index + 2,
          line.account.accountId,
          isReceipt ? 0 : line.amount,
          isReceipt ? line.amount : 0,
          input.description,
          actor
        );
      }
      const source = await sql`
        INSERT INTO acc_cash_entries
          (uuid, company_id, financial_year_id, line_number, entry_number, entry_date, entry_type,
           account_id, counterpart_account_id, amount, reference, description, status,
           posted_entry_id, created_by)
        VALUES (${sourceUuid}, ${scope.companyId}, ${scope.financialYearId}, ${lineNumber}, ${entryNumber},
          ${input.entryDate}, ${input.type}, ${account.accountId}, ${counterpart.accountId}, ${input.amount},
          ${input.reference?.trim() ?? ""}, ${input.description.trim()}, 'posted', ${centralId}, ${actor})
      `.execute(transaction);
      const cashEntryId = Number(source.insertId);
      for (const [index, line] of counterpartLines.entries()) {
        await sql`
          INSERT INTO acc_cash_entry_lines
            (uuid, cash_entry_id, line_number, core_ledger_id, account_id, amount, created_by)
          VALUES (${publicUuid()}, ${cashEntryId}, ${index + 1}, ${line.ledgerId},
            ${line.account.accountId}, ${line.amount}, ${actor})
        `.execute(transaction);
      }
    });
    return (await this.getEntry(databaseName, sourceUuid))!;
  }
}

async function resolveLedgerAccount(
  database: Transaction<AccountsDatabase>,
  ledgerId: number,
  cashAccount: boolean,
  actor: string
) {
  const scope = currentAccountsScope();
  const ledgerResult = await sql<CoreLedgerRow>`
    SELECT ledger.id, ledger.name, ledger_group.name AS group_name
    FROM core_ledgers ledger
    INNER JOIN core_ledger_groups ledger_group ON ledger_group.id=ledger.ledger_group_id
    WHERE ledger.id=${ledgerId} AND ledger.status='active' AND ledger_group.status='active'
    LIMIT 1
  `.execute(database);
  const ledger = ledgerResult.rows[0];
  if (!ledger) throw AppError.validation("The selected Core ledger is invalid or inactive.");

  const linked = await sql<BookAccountRow>`
    SELECT account.id, account.uuid, account.code, account.name, account.account_type,
           account.opening_balance
    FROM acc_core_ledger_links link
    INNER JOIN acc_accounts account ON account.id=link.account_id
    WHERE link.company_id=${scope.companyId} AND link.financial_year_id=${scope.financialYearId}
      AND link.core_ledger_id=${ledgerId} AND account.deleted_at IS NULL
      AND account.status='active' AND account.is_group=0 AND account.is_postable=1
    LIMIT 1
  `.execute(database);
  if (linked.rows[0]) {
    if (cashAccount)
      await sql`UPDATE acc_accounts SET is_cash=1, updated_by=${actor}
        WHERE id=${linked.rows[0].id}`.execute(database);
    return toAccount(linked.rows[0]);
  }

  const matching = await sql<BookAccountRow>`
    SELECT id, uuid, code, name, account_type, opening_balance
    FROM acc_accounts
    WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      AND LOWER(TRIM(name))=LOWER(TRIM(${ledger.name})) AND deleted_at IS NULL
      AND status='active' AND is_group=0 AND is_postable=1
      ${cashAccount ? sql`AND is_cash=1` : sql``}
    ORDER BY id LIMIT 1
  `.execute(database);
  let account = matching.rows[0] ? toAccount(matching.rows[0]) : null;
  if (!account) {
    const classification = classifyLedger(ledger.group_name, cashAccount);
    const inserted = await sql`
      INSERT INTO acc_accounts
        (uuid, company_id, financial_year_id, group_id, code, name, account_type,
         normal_balance, is_group, is_system, is_postable, opening_balance, currency_code,
         description, status, is_cash, is_bank, created_by)
      VALUES (${publicUuid()}, ${scope.companyId}, ${scope.financialYearId}, NULL,
        ${await availableCoreAccountCode(database, ledgerId)}, ${ledger.name},
        ${classification.accountType}, ${classification.normalBalance}, 0, 0, 1, 0, 'INR',
        ${`Linked to Core Common Ledger ${ledgerId}.`}, 'active', ${cashAccount}, 0, ${actor})
    `.execute(database);
    const created = await sql<BookAccountRow>`
      SELECT id, uuid, code, name, account_type, opening_balance
      FROM acc_accounts WHERE id=${Number(inserted.insertId)} LIMIT 1
    `.execute(database);
    account = toAccount(created.rows[0]!);
  }
  await sql`
    INSERT INTO acc_core_ledger_links
      (uuid, company_id, financial_year_id, core_ledger_id, account_id, created_by)
    VALUES (${publicUuid()}, ${scope.companyId}, ${scope.financialYearId}, ${ledgerId},
      ${account.accountId}, ${actor})
  `.execute(database);
  return account;
}

async function availableCoreAccountCode(database: Transaction<AccountsDatabase>, ledgerId: number) {
  const scope = currentAccountsScope();
  const base = `CORE-${ledgerId}`;
  const result = await sql<{ code: string }>`
    SELECT code FROM acc_accounts
    WHERE company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      AND code LIKE ${`${base}%`}
  `.execute(database);
  const used = new Set(result.rows.map((row) => row.code));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function classifyLedger(groupName: string, cashAccount: boolean) {
  if (cashAccount) return { accountType: "asset", normalBalance: "debit" } as const;
  const normalized = groupName.trim().toLowerCase();
  if (normalized.includes("liabil"))
    return { accountType: "liability", normalBalance: "credit" } as const;
  if (normalized.includes("equity") || normalized.includes("capital"))
    return { accountType: "equity", normalBalance: "credit" } as const;
  if (normalized.includes("income") || normalized.includes("revenue"))
    return { accountType: "income", normalBalance: "credit" } as const;
  if (normalized.includes("expense"))
    return { accountType: "expense", normalBalance: "debit" } as const;
  return { accountType: "asset", normalBalance: "debit" } as const;
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
    INSERT INTO acc_entry_lines
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
  source_type: CashBookRegisterLine["sourceType"];
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
  cash_ledger_group_name: string | null;
  cash_ledger_id: number | null;
  cash_ledger_name: string | null;
  counterpart_ledger_group_name: string | null;
  counterpart_ledger_id: number | null;
  counterpart_ledger_name: string | null;
  description: string;
  entry_date: string;
  entry_number: string;
  entry_type: CashBookEntry["type"];
  posted_entry_uuid: string;
  reference: string | null;
  status: CashBookEntry["status"];
  source_id: number;
  uuid: string;
};
type CashEntryLineRow = {
  account_code: string;
  account_id: number;
  account_name: string;
  account_uuid: string;
  amount: string | number;
  ledger_group_name: string | null;
  ledger_id: number | null;
  ledger_name: string | null;
  line_number: number;
};
type CoreLedgerRow = {
  group_name: string;
  id: number;
  name: string;
};

function toAccount(row: BookAccountRow): CashBookAccount {
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
function toEntry(row: BookEntryRow): CashBookEntry {
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
    cashLedger:
      row.cash_ledger_id && row.cash_ledger_name
        ? {
            groupName: row.cash_ledger_group_name ?? "",
            id: Number(row.cash_ledger_id),
            name: row.cash_ledger_name
          }
        : null,
    counterpart: {
      accountId: row.counterpart_account_id,
      code: row.counterpart_code,
      id: row.counterpart_uuid,
      name: row.counterpart_name
    },
    counterpartLedger:
      row.counterpart_ledger_id && row.counterpart_ledger_name
        ? {
            groupName: row.counterpart_ledger_group_name ?? "",
            id: Number(row.counterpart_ledger_id),
            name: row.counterpart_ledger_name
          }
        : null,
    description: row.description,
    entryDate: row.entry_date,
    entryNumber: row.entry_number,
    id: row.uuid,
    lines: [],
    postedEntryId: row.posted_entry_uuid,
    reference: row.reference ?? "",
    status: row.status,
    type: row.entry_type
  };
}
function toEntryLine(row: CashEntryLineRow): CashBookEntry["lines"][number] {
  return {
    account: {
      accountId: Number(row.account_id),
      code: row.account_code,
      id: row.account_uuid,
      name: row.account_name
    },
    amount: money(row.amount),
    ledger:
      row.ledger_id && row.ledger_name
        ? {
            groupName: row.ledger_group_name ?? "",
            id: Number(row.ledger_id),
            name: row.ledger_name
          }
        : null,
    lineNumber: Number(row.line_number)
  };
}
function toLedger(row: CoreLedgerRow): CashBookLedger {
  return { groupName: row.group_name, id: Number(row.id), name: row.name };
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
