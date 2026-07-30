import { AppOrchestrationRepository } from "./app-orchestration.repository.js";

export class AppOrchestrationService {
  constructor(private readonly repository = new AppOrchestrationRepository()) {}

  list() {
    return this.repository.list();
  }

  async get(id: string) {
    return (await this.list()).find((item) => item.id === id) ?? null;
  }
}
