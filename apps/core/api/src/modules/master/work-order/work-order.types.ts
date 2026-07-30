export type WorkOrderStatus = "active" | "inactive" | "suspend" | "deleted";
export type WorkOrderRecord = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  status: WorkOrderStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
export type WorkOrderSaveInput = Partial<
  Omit<WorkOrderRecord, "id" | "uuid" | "createdAt" | "updatedAt" | "deletedAt">
> & { code: string; name: string };
export type WorkOrderListFilters = { search?: string };
