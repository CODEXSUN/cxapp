import { AppError } from "@cxapp/framework/errors";
import { currentAccountsScope } from "../../auth/accounts-scope.js";
import { BankBookRepository } from "./bank-book.repository.js";
import type { BankBookEntryPayload, BankBookRegister } from "./bank-book.types.js";

export class BankBookService {
  constructor(private readonly repository = new BankBookRepository()) {}

  async register(databaseName: string): Promise<BankBookRegister | null> {
    return this.repository.register(databaseName);
  }

  getEntry(databaseName: string, id: string) {
    return this.repository.getEntry(databaseName, id);
  }

  async postEntry(databaseName: string, input: BankBookEntryPayload) {
    const scope = currentAccountsScope();
    if (input.companyId !== scope.companyId || input.financialYearId !== scope.financialYearId)
      throw AppError.validation("Bank entry context does not match the active accounting scope.");
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (amount <= 0) throw AppError.validation("The entry amount must be greater than zero.");
    return this.repository.postEntry(databaseName, { ...input, amount });
  }
}
