import { AppError } from "@cxapp/framework/errors";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { AccountingService } from "../accounting/accounting.service.js";
import { money } from "../accounting/accounting.repository.js";
import { BookRepository } from "./book.repository.js";
import type { BookEntryPayload, BookRegister } from "./book.types.js";

export class BookService {
  constructor(
    private readonly repository = new BookRepository(),
    private readonly accounting = new AccountingService()
  ) {}

  async register(databaseName: string, kind: "cash" | "bank"): Promise<BookRegister | null> {
    return this.repository.register(databaseName, kind);
  }

  async postEntry(databaseName: string, kind: "cash" | "bank", input: BookEntryPayload) {
    const scope = currentAccountsScope();
    const amount = money(input.amount);
    if (amount <= 0)
      throw AppError.validation("The entry amount must be greater than zero.");
    const bookAccount = await this.repository.findBookAccount(
      databaseName,
      kind,
      input.accountId
    );
    if (!bookAccount)
      throw AppError.validation(
        `The selected ${kind} account is invalid or inactive.`
      );
    const counterpart = await this.accounting.getAccount(
      databaseName,
      input.counterpartAccountId
    );
    if (!counterpart)
      throw AppError.validation("The selected counterpart account is invalid or inactive.");

    const isReceipt = input.type === "receipt";
    const bookDebit = isReceipt ? amount : 0;
    const bookCredit = isReceipt ? 0 : amount;
    const counterpartDebit = isReceipt ? 0 : amount;
    const counterpartCredit = isReceipt ? amount : 0;

    const entryNumber =
      input.entryNumber?.trim().toUpperCase() ||
      (await this.repository.nextEntryNumber(databaseName, prefixFor(kind)));

    const journal = await this.accounting.createJournal(databaseName, {
      accountingPeriodId: null,
      companyId: scope.companyId,
      description: input.description.trim(),
      entryDate: input.entryDate,
      entryNumber,
      financialYearId: scope.financialYearId,
      lines: [
        {
          accountId: bookAccount.accountId,
          credit: bookCredit,
          debit: bookDebit,
          description: input.description.trim()
        },
        {
          accountId: counterpart.accountId,
          credit: counterpartCredit,
          debit: counterpartDebit,
          description: input.description.trim()
        }
      ],
      reference: input.reference?.trim() ?? "",
      status: "ready_to_post"
    });

    const submitted = await this.accounting.submitJournal(databaseName, journal.id);
    if (!submitted) throw AppError.conflict("The entry could not be submitted.");
    const posted = await this.accounting.postJournal(databaseName, submitted.id, actor());
    if (!posted) throw AppError.conflict("The entry could not be posted.");
    return posted;
  }
}

function prefixFor(kind: "cash" | "bank") {
  return kind === "cash" ? "CR" : "BR";
}

function actor() {
  return "system:book";
}