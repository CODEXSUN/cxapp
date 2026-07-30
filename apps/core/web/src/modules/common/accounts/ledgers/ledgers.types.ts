export type LedgerStatus = "active" | "inactive";
export type LedgerRecord = {
  id: number;
  ledgerGroupId: number;
  ledgerGroupName: string;
  name: string;
  status: LedgerStatus;
};
export type LedgerSavePayload = { ledgerGroupId: number; name: string; status: LedgerStatus };
export type LedgerListFilters = { search?: string };
export type LedgerGroupLookup = { id: number; name: string; status: LedgerStatus };
