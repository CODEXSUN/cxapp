export const accountingEventNames = {
  groupCreated: "accounts.accounting.group.created",
  groupUpdated: "accounts.accounting.group.updated",
  groupDeleted: "accounts.accounting.group.deleted",
  accountCreated: "accounts.accounting.account.created",
  accountUpdated: "accounts.accounting.account.updated",
  accountStatusChanged: "accounts.accounting.account.status",
  journalCreated: "accounts.accounting.journal.created",
  journalUpdated: "accounts.accounting.journal.updated",
  journalSubmitted: "accounts.accounting.journal.submitted",
  journalPosted: "accounts.accounting.journal.posted",
  journalReversed: "accounts.accounting.journal.reversed",
  journalCancelled: "accounts.accounting.journal.cancelled",
  journalDeleted: "accounts.accounting.journal.deleted",
  periodCreated: "accounts.accounting.period.created",
  periodStatusChanged: "accounts.accounting.period.status"
} as const;

export type AccountingEventName = (typeof accountingEventNames)[keyof typeof accountingEventNames];

export type AccountingEventEnvelope = {
  action: AccountingEventName;
  companyId: number;
  financialYearId: number;
  happenedAt: string;
  journalId?: string | undefined;
  recordId: string;
};

export function buildAccountingEvent(
  input: Pick<AccountingEventEnvelope, "action" | "companyId" | "financialYearId" | "recordId"> &
    Partial<Pick<AccountingEventEnvelope, "journalId">>
): AccountingEventEnvelope {
  return {
    action: input.action,
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    happenedAt: new Date().toISOString(),
    journalId: input.journalId,
    recordId: input.recordId
  };
}