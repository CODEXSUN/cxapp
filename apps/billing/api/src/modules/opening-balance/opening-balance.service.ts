import { AppError } from "@cxapp/framework/errors";
import { currentBillingScope } from "../../auth/billing-scope.js";
import { OpeningBalanceRepository } from "./opening-balance.repository.js";
import type { OpeningBalanceInput } from "./opening-balance.types.js";

export class OpeningBalanceService {
  private readonly repository = new OpeningBalanceRepository();
  list(databaseName: string) {
    return this.repository.list(databaseName);
  }
  save(databaseName: string, input: OpeningBalanceInput, actor: string) {
    if (!currentBillingScope().canEditFinalizedEntries)
      throw AppError.forbidden("Only Admin can change opening balances.");
    if (!input.reason.trim()) throw AppError.validation("Enter a reason for the opening balance.");
    if (!Number.isFinite(input.amount) || Math.abs(input.amount) > 999999999999.99)
      throw AppError.validation("Opening balance is outside the supported range.");
    return this.repository.save(
      databaseName,
      { ...input, reason: input.reason.trim(), amount: Math.round(input.amount * 100) / 100 },
      actor
    );
  }
}
