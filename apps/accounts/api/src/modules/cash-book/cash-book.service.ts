import { AppError } from "@cxapp/framework/errors";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { CashBookRepository } from "./cash-book.repository.js";
import type { CashBookEntryPayload, CashBookRegister } from "./cash-book.types.js";

export class CashBookService {
  constructor(private readonly repository = new CashBookRepository()) {}

  async register(databaseName: string): Promise<CashBookRegister | null> {
    return this.repository.register(databaseName);
  }

  context(databaseName: string) {
    return this.repository.context(databaseName);
  }

  ledgers(databaseName: string) {
    return this.repository.ledgers(databaseName);
  }

  getEntry(databaseName: string, id: string) {
    return this.repository.getEntry(databaseName, id);
  }

  async postEntry(databaseName: string, input: CashBookEntryPayload) {
    const scope = currentAccountsScope();
    if (input.companyId !== scope.companyId || input.financialYearId !== scope.financialYearId)
      throw AppError.validation("Cash entry context does not match the active accounting scope.");
    const lines = input.lines.map((line) => ({
      amount: Math.round(Number(line.amount || 0) * 100) / 100,
      ledgerId: line.ledgerId
    }));
    if (lines.some((line) => line.amount <= 0))
      throw AppError.validation("Every cash entry row must have an amount greater than zero.");
    if (lines.some((line) => line.ledgerId === input.cashLedgerId))
      throw AppError.validation("Cash and counterpart ledgers must be different.");
    if (new Set(lines.map((line) => line.ledgerId)).size !== lines.length)
      throw AppError.validation("Each counterpart ledger can be selected only once.");
    const amount = Math.round(lines.reduce((total, line) => total + line.amount, 0) * 100) / 100;
    return this.repository.postEntry(databaseName, { ...input, amount, lines });
  }
}
