export type WorkOrderRecord = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  status: "active" | "inactive" | "suspend" | "deleted";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
export type WorkOrderSavePayload = Partial<
  Pick<WorkOrderRecord, "code" | "name" | "status" | "isActive">
>;
export type WorkOrderLookupRecord = {
  id: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
};
