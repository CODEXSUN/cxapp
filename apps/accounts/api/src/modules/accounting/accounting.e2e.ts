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

    const service = new AccountingService();

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

      // 8. Reversal keeps the original intact and restores the balance.
      const reversed = await service.reverseJournal(databaseName, draft.id, "user@example.com");
      assert.ok(reversed, "Reversal journal must be created and posted.");
      assert.equal(reversed.status, "posted");
      assert.match(reversed.entryNumber, /RV-/);
      const originalAfterReverse: JournalEntry | null = await service.getJournal(
        databaseName,
        draft.id
      );
      assert.equal(originalAfterReverse?.status, "posted", "Original entry stays posted.");
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
