import { AppError } from "@cxapp/framework/errors";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { AccountingService } from "../accounting/accounting.service.js";
import { money } from "../accounting/accounting.repository.js";
import { CashBookRepository } from "./cash-book.repository.js";
import type { CashBookEntryPayload, CashBookRegister } from "./cash-book.types.js";

export class CashBookService {
  constructor(
    private readonly repository = new CashBookRepository(),
    private readonly accounting = new AccountingService()
  ) {}

  async register(databaseName: string): Promise<CashBookRegister | null> {
    return this.repository.register(databaseName);
  }

  async postEntry(databaseName: string, input: CashBookEntryPayload) {
    const scope = currentAccountsScope();
    const amount = money(input.amount);
    if (amount <= 0) throw AppError.validation("The entry amount must be greater than zero.");
    const cashAccount = await this.repository.findCashAccount(databaseName, input.accountId);
    if (!cashAccount)
      throw AppError.validation("The selected cash account is invalid or inactive.");
    const counterpart = await this.accounting.getAccount(databaseName, input.counterpartAccountId);
    if (!counterpart)
      throw AppError.validation("The selected counterpart account is invalid or inactive.");

    const isReceipt = input.type === "receipt";
    const entryNumber =
      input.entryNumber?.trim().toUpperCase() ||
      (await this.repository.nextEntryNumber(databaseName));

    const journal = await this.accounting.createJournal(databaseName, {
      accountingPeriodId: null,
      companyId: scope.companyId,
      description: input.description.trim(),
      entryDate: input.entryDate,
      entryNumber,
      financialYearId: scope.financialYearId,
      lines: [
        {
          accountId: cashAccount.accountId,
          credit: isReceipt ? 0 : amount,
          debit: isReceipt ? amount : 0,
          description: input.description.trim()
        },
        {
          accountId: counterpart.accountId,
          credit: isReceipt ? amount : 0,
          debit: isReceipt ? 0 : amount,
          description: input.description.trim()
        }
      ],
      reference: input.reference?.trim() ?? "",
      status: "ready_to_post"
    });

    const submitted = await this.accounting.submitJournal(databaseName, journal.id);
    if (!submitted) throw AppError.conflict("The entry could not be submitted.");
    const posted = await this.accounting.postJournal(databaseName, submitted.id, "system:cash-book");
    if (!posted) throw AppError.conflict("The entry could not be posted.");
    return posted;
  }
}