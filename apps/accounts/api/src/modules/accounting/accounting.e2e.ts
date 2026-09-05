import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createConnection } from "mysql2/promise";
import { getDefaultCompanyForDatabase, bootstrapCoreDatabase } from "@cxapp/core-api";
import {
  bootstrapAccountsDatabase,
  closeAllAccountsDatabases
} from "../../database/accounts-database.js";
import { env } from "../../env.js";
import { runWithAccountsScopeData, type AccountsScope } from "../../auth/accounts-scope.js";
import { AccountingService } from "./accounting.service.js";
import { CashBookService } from "../cash-book/cash-book.service.js";
import { BankBookService } from "../bank-book/bank-book.service.js";
import type { AccountGroup, JournalEntry, LedgerView } from "./accounting.types.js";

export async function runAccountingE2e() {
  const databaseName = `cxapp_accounting_e2e_${Date.now()}`;
  const admin = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  });

  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrapCoreDatabase(databaseName);
    const defaults = await getDefaultCompanyForDatabase(databaseName);
    assert.ok(defaults, "Core default company settings must exist before Accounts seeds.");
    const scope: AccountsScope = {
      companyId: defaults.companyId,
      financialYearId: defaults.financialYearId
    };
    await bootstrapAccountsDatabase(databaseName);
    await admin.query(
      `INSERT IGNORE INTO \`${databaseName}\`.core_ledgers (ledger_group_id,name,status)
       SELECT id,'Cash in Hand','active' FROM \`${databaseName}\`.core_ledger_groups
       WHERE LOWER(name)='general' LIMIT 1`
    );
    await admin.query(
      `INSERT IGNORE INTO \`${databaseName}\`.core_ledgers (ledger_group_id,name,status)
       SELECT id,'Sales','active' FROM \`${databaseName}\`.core_ledger_groups
       WHERE LOWER(name)='general' LIMIT 1`
    );
    await admin.query(
      `INSERT IGNORE INTO \`${databaseName}\`.core_ledgers (ledger_group_id,name,status)
       SELECT id,'Office Expenses','active' FROM \`${databaseName}\`.core_ledger_groups
       WHERE LOWER(name)='general' LIMIT 1`
    );
    const [coreLedgerRows] = await admin.query(
      `SELECT id,name FROM \`${databaseName}\`.core_ledgers WHERE name IN ('Cash in Hand','Sales','Office Expenses')`
    );
    const coreLedgers = new Map(
      (coreLedgerRows as Array<{ id: number; name: string }>).map((row) => [row.name, row.id])
    );
    const cashLedgerId = coreLedgers.get("Cash in Hand")!;
    const salesLedgerId = coreLedgers.get("Sales")!;
    const expenseLedgerId = coreLedgers.get("Office Expenses")!;

    const service = new AccountingService();
    const cashBook = new CashBookService();
    const bankBook = new BankBookService();

    await runWithAccountsScopeData(scope, async () => {
      // 1. Chart of accounts is seeded with groups and postable accounts.
      const groups = await service.listGroups(databaseName);
      assert.equal(groups.length, 5, "Five default ledger groups must be seeded.");
      assert.ok(
        groups.some((group: AccountGroup) => group.code === "1000" && group.name === "Assets"),
        "Assets group must be seeded as code 1000."
      );

      const accounts = await service.listAccounts(databaseName);
      assert.ok(accounts.length >= 7, "Default chart of accounts must be seeded.");
      assert.ok(
        accounts.every((account) => account.isPostable === true),
        "Seeded accounts must be postable."
      );

      const periods = await service.listPeriods(databaseName);
      assert.equal(periods.length, 1, "A system Annual accounting period must be seeded.");
      assert.equal(periods[0]?.status, "open");
      assert.equal(periods[0]?.isSystem, true);

      // 2. Create a balanced journal entry and confirm it stays draft.
      const cash = accounts.find((account) => account.code === "1001");
      const sales = accounts.find((account) => account.code === "4001");
      assert.ok(cash, "Cash in Hand account must be seeded.");
      assert.ok(sales, "Sales account must be seeded.");

      const entryDate = new Date().toISOString().slice(0, 10);
      const draft = await service.createJournal(databaseName, {
        accountingPeriodId: null,
        companyId: scope.companyId,
        description: "Record cash sale",
        entryDate,
        entryNumber: "JE-0001",
        financialYearId: scope.financialYearId,
        lines: [
          { accountId: cash.accountId, debit: 100, credit: 0 },
          { accountId: sales.accountId, debit: 0, credit: 100 }
        ],
        status: "draft"
      });
      assert.equal(draft.status, "draft");
      assert.equal(draft.totalDebit, 100);
      assert.equal(draft.totalCredit, 100);

      // 3. An unbalanced entry must be rejected.
      await assert.rejects(
        service.createJournal(databaseName, {
          accountingPeriodId: null,
          companyId: scope.companyId,
          description: "Unbalanced",
          entryDate,
          entryNumber: "JE-0002",
          financialYearId: scope.financialYearId,
          lines: [
            { accountId: cash.accountId, debit: 100, credit: 0 },
            { accountId: sales.accountId, debit: 0, credit: 90 }
          ],
          status: "ready_to_post"
        }),
        /balance/i,
        "Unbalanced journal entries must be rejected on submit."
      );

      // 4. Submit then post the balanced entry.
      const submitted = await service.submitJournal(databaseName, draft.id);
      assert.equal(submitted?.status, "ready_to_post");
      const posted = await service.postJournal(databaseName, draft.id, "user@example.com");
      assert.equal(posted?.status, "posted");

      // 5. Posted entries are immutable.
      await assert.rejects(
        service.updateJournal(databaseName, draft.id, {
          accountingPeriodId: null,
          companyId: scope.companyId,
          description: "Cannot edit",
          entryDate,
          entryNumber: "JE-0001",
          financialYearId: scope.financialYearId,
          lines: [
            { accountId: cash.accountId, debit: 200, credit: 0 },
            { accountId: sales.accountId, debit: 0, credit: 200 }
          ],
          status: "draft"
        }),
        /Only draft/i,
        "Posted journal entries cannot be edited."
      );

      // 6. Ledger reflects the posted activity and closing balance.
      const ledger: LedgerView | null = await service.ledgerForAccount(databaseName, cash.id);
      assert.ok(ledger, "Cash ledger must exist after posting.");
      assert.equal(ledger.lines.length, 1);
      assert.equal(ledger.lines[0]?.debit, 100);
      assert.equal(ledger.closingBalance, 100);
      assert.equal(ledger.account.balance, 100);

      // 7. A second posting accumulates correctly and a single-line entry is rejected.
      const second = await service.createJournal(databaseName, {
        accountingPeriodId: null,
        companyId: scope.companyId,
        description: "Record another cash sale",
        entryDate,
        entryNumber: "JE-0003",
        financialYearId: scope.financialYearId,
        lines: [
          { accountId: cash.accountId, debit: 50, credit: 0 },
          { accountId: sales.accountId, debit: 0, credit: 50 }
        ],
        status: "ready_to_post"
      });
      await service.postJournal(databaseName, second.id, "user@example.com");
      const ledgerAfter = await service.ledgerForAccount(databaseName, cash.id);
      assert.equal(ledgerAfter?.closingBalance, 150);

      await assert.rejects(
        service.createJournal(databaseName, {
          accountingPeriodId: null,
          companyId: scope.companyId,
          description: "Single line",
          entryDate,
          entryNumber: "JE-0004",
          financialYearId: scope.financialYearId,
          lines: [{ accountId: cash.accountId, debit: 10, credit: 0 }],
          status: "draft"
        }),
        /at least two lines/i,
        "A journal entry requires at least two lines."
      );

      // 8. Reversal preserves the original values, marks it reversed, and restores the balance.
      const reversed = await service.reverseJournal(databaseName, draft.id, "user@example.com");
      assert.ok(reversed, "Reversal journal must be created and posted.");
      assert.equal(reversed.status, "posted");
      assert.match(reversed.entryNumber, /RV-/);
      const originalAfterReverse: JournalEntry | null = await service.getJournal(
        databaseName,
        draft.id
      );
      assert.equal(originalAfterReverse?.status, "reversed", "Original entry is marked reversed.");
      assert.equal(originalAfterReverse?.totalDebit, 100);

      const ledgerAfterReverse = await service.ledgerForAccount(databaseName, cash.id);
      assert.equal(
        ledgerAfterReverse?.closingBalance,
        50,
        "Reversing JE-0001 brings the cash balance back to 50 (150 - 100)."
      );

      // 9. Periods support open -> closed lifecycle (system Annual cannot be locked).
      await assert.rejects(
        service.setPeriodStatus(databaseName, periods[0]?.id ?? "", "locked"),
        /system Annual period/i,
        "The system Annual period cannot be locked."
      );

      const createdPeriod = await service.createPeriod(databaseName, {
        companyId: scope.companyId,
        endDate: entryDate,
        financialYearId: scope.financialYearId,
        name: "Special Period",
        startDate: entryDate,
        status: "open"
      });
      assert.equal(createdPeriod.status, "open");
      const closedPeriod = await service.setPeriodStatus(databaseName, createdPeriod.id, "closed");
      assert.equal(closedPeriod?.status, "closed");

      // 10. Cash and bank accounts are classified for the cash and bank books.
      const bank = accounts.find((account) => account.code === "1002");
      assert.ok(bank, "Bank Account must be seeded.");
      const flaggedAccounts = await service.listAccounts(databaseName);
      assert.ok(
        flaggedAccounts.some((account) => account.code === "1001" && account.isCash),
        "Cash in Hand must be classified as a cash account."
      );
      assert.ok(
        flaggedAccounts.some((account) => account.code === "1002" && account.isBank),
        "Bank Account must be classified as a bank account."
      );

      // 11. Cash book register reflects centralized activity and quick entries own their source row.
      const cashRegister = await cashBook.register(databaseName);
      assert.ok(cashRegister, "Cash book register must resolve cash accounts.");
      assert.ok(
        cashRegister.accounts.some((account) => account.code === "1001"),
        "Cash book must list the Cash in Hand account."
      );
      assert.ok(
        cashRegister.lines.length > 0,
        "Cash book register must include previously posted cash activity."
      );
      assert.deepEqual(await cashBook.context(databaseName), {
        rowPosition: 1,
        suggestedEntryNumber: "CR-000001"
      });

      const receipt = await cashBook.postEntry(databaseName, {
        cashLedgerId,
        companyId: scope.companyId,
        description: "Cash receipt from quick entry",
        entryDate,
        entryNumber: "",
        financialYearId: scope.financialYearId,
        lines: [{ amount: 250, ledgerId: salesLedgerId }],
        type: "receipt"
      });
      assert.ok(receipt, "Quick cash receipt must create an independent cash entry.");
      assert.equal(receipt.status, "posted");
      assert.equal(receipt.cashLedger?.id, cashLedgerId);
      assert.equal(receipt.counterpartLedger?.id, salesLedgerId);
      assert.equal((await cashBook.getEntry(databaseName, receipt.id))?.id, receipt.id);

      const registerAfterReceipt = await cashBook.register(databaseName);
      assert.equal(
        registerAfterReceipt?.closingBalance,
        300,
        "Cash book closing balance must increase by the 250 receipt (50 + 250)."
      );

      const cashPayment = await cashBook.postEntry(databaseName, {
        cashLedgerId,
        companyId: scope.companyId,
        description: "Cash payment from quick entry",
        entryDate,
        entryNumber: "",
        financialYearId: scope.financialYearId,
        lines: [
          { amount: 40, ledgerId: salesLedgerId },
          { amount: 35, ledgerId: expenseLedgerId }
        ],
        type: "payment"
      });
      const [cashPaymentLines] = await admin.query(
        `SELECT line.account_id,line.debit,line.credit
         FROM \`${databaseName}\`.accounts_entry_lines line
         INNER JOIN \`${databaseName}\`.accounts_cash_entries source
           ON source.posted_entry_id=line.entry_id
         WHERE source.uuid=? ORDER BY line.line_number`,
        [cashPayment.id]
      );
      const cashPaymentPosting = cashPaymentLines as Array<{
        account_id: number;
        credit: string | number;
        debit: string | number;
      }>;
      assert.equal(Number(cashPaymentPosting[0]?.account_id), cashPayment.account.accountId);
      assert.equal(Number(cashPaymentPosting[0]?.credit), 75);
      assert.equal(Number(cashPaymentPosting[1]?.account_id), cashPayment.counterpart.accountId);
      assert.equal(Number(cashPaymentPosting[1]?.debit), 40);
      assert.equal(Number(cashPaymentPosting[2]?.debit), 35);
      assert.equal(cashPayment.lines.length, 2);
      assert.equal(
        (await cashBook.register(databaseName))?.closingBalance,
        225,
        "Cash Out must credit cash and reduce the cash book balance by 75."
      );
      assert.deepEqual(await cashBook.context(databaseName), {
        rowPosition: 3,
        suggestedEntryNumber: "CR-000003"
      });

      // 12. A bank payment posts the bank side and is rejected when unbalanced period is missing.
      const bankBookRegister = await bankBook.register(databaseName);
      assert.ok(bankBookRegister, "Bank book register must resolve bank accounts.");
      assert.ok(bankBookRegister.accounts.some((account) => account.code === "1002"));

      const payment = await bankBook.postEntry(databaseName, {
        accountId: bank.id,
        amount: 100,
        companyId: scope.companyId,
        counterpartAccountId: sales.id,
        description: "Bank payment from quick entry",
        entryDate,
        entryNumber: "",
        financialYearId: scope.financialYearId,
        type: "payment"
      });
      assert.equal(payment.status, "posted");
      assert.equal((await bankBook.getEntry(databaseName, payment.id))?.id, payment.id);
      const bankLedger = await service.ledgerForAccount(databaseName, bank.id);
      assert.equal(
        bankLedger?.closingBalance,
        -100,
        "Bank payment must reduce the bank account balance by 100."
      );

      await assert.rejects(
        cashBook.postEntry(databaseName, {
          cashLedgerId,
          companyId: scope.companyId,
          description: "Invalid",
          entryDate,
          entryNumber: "",
          financialYearId: scope.financialYearId,
          lines: [{ amount: -5, ledgerId: salesLedgerId }],
          type: "receipt"
        }),
        /greater than zero/i,
        "A book entry amount must be positive."
      );

      const [postingRows] = await admin.query(
        `SELECT
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_cash_entries) AS cash_entries,
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_cash_entry_lines) AS cash_entry_lines,
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_bank_entries) AS bank_entries,
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_entries WHERE source_type='cash-book') AS cash_postings,
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_entry_lines line
             INNER JOIN \`${databaseName}\`.accounts_entries entry ON entry.id=line.entry_id
             WHERE entry.source_type='cash-book') AS cash_posting_lines,
          (SELECT COUNT(*) FROM \`${databaseName}\`.accounts_entries WHERE source_type='bank-book') AS bank_postings`
      );
      const postingCounts = (
        postingRows as Array<{
          bank_entries: string | number;
          bank_postings: string | number;
          cash_entries: string | number;
          cash_entry_lines: string | number;
          cash_posting_lines: string | number;
          cash_postings: string | number;
        }>
      )[0]!;
      assert.equal(Number(postingCounts.cash_entries), 2);
      assert.equal(Number(postingCounts.cash_entry_lines), 3);
      assert.equal(Number(postingCounts.cash_postings), 2);
      assert.equal(Number(postingCounts.cash_posting_lines), 5);
      assert.equal(Number(postingCounts.bank_entries), 1);
      assert.equal(Number(postingCounts.bank_postings), 1);
    });

    return {
      companyId: scope.companyId,
      databaseName,
      financialYearId: scope.financialYearId
    };
  } finally {
    await closeAllAccountsDatabases();
    await admin.changeUser({ database: env.DB_MASTER_NAME });
    await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await admin.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAccountingE2e()
    .then((result) => {
      console.log("Accounting E2E passed", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
