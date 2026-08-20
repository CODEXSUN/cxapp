import { AppError } from "@cxapp/framework/errors";
import { AccountingRepository } from "./accounting.repository.js";

export type AccountingJobName = "accounts.journal.post" | "accounts.journal.reverse";

export type AccountingJobPayload = {
  actorEmail: string;
  journalId: string;
};

export const accountingJobs: Record<AccountingJobName, { description: string }> = {
  "accounts.journal.post": {
    description: "Posts a ready-to-post journal entry atomically into the ledger."
  },
  "accounts.journal.reverse": {
    description: "Posts a reversing journal entry for a posted entry."
  }
};

export async function processAccountingJob(
  databaseName: string,
  jobName: AccountingJobName,
  payload: AccountingJobPayload
) {
  const repository = new AccountingRepository();
  if (jobName === "accounts.journal.post") {
    const journal = await repository.postJournal(
      databaseName,
      payload.journalId,
      payload.actorEmail
    );
    if (!journal) throw AppError.notFound("The journal entry to post was not found.");
    return journal;
  }
  if (jobName === "accounts.journal.reverse") {
    throw AppError.conflict(
      "Reversals are computed and posted synchronously; no background reversal job is required."
    );
  }
  throw AppError.validation(`Unsupported Accounting job: ${jobName}`);
}
