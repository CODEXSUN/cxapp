import { PlatformActivityRepository } from "./platform-activity.repository.js";
import type { PlatformActivityInput } from "./platform-activity.types.js";

export class PlatformActivityService {
  constructor(private readonly repository = new PlatformActivityRepository()) {}
  listActivity() {
    return this.repository.list();
  }
  recordActivity(input: PlatformActivityInput) {
    validateActivity(input);
    return this.repository.record(input);
  }
}

export function validateActivity(input: PlatformActivityInput) {
  if (!input.moduleKey.trim() || !input.action.trim() || !input.recordLabel.trim()) {
    throw new Error("Activity module, action, and record label are required.");
  }
}
