export type LedgerGroupStatus = "active" | "inactive";
export type LedgerGroupRecord = { id: number; name: string; status: LedgerGroupStatus };
export type LedgerGroupSavePayload = { name: string; status: LedgerGroupStatus };
export type LedgerGroupListFilters = { search?: string };
