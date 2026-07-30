import { WorkOrderRepository } from "./work-order.repository.js";
import type { WorkOrderListFilters, WorkOrderSaveInput } from "./work-order.types.js";
export class WorkOrderService {
  constructor(private readonly repository = new WorkOrderRepository()) {}
  list(filters: WorkOrderListFilters = {}) {
    return this.repository.list(filters);
  }
  find(id: string) {
    return this.repository.find(id);
  }
  create(input: WorkOrderSaveInput) {
    return this.repository.create(input);
  }
  update(id: string, input: WorkOrderSaveInput) {
    return this.repository.update(id, input);
  }
  setActive(id: string, active: boolean) {
    return this.repository.setActive(id, active);
  }
  forceDelete(id: string) {
    return this.repository.forceDelete(id);
  }
}
