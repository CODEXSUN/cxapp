import { IndustryRepository } from "./industry.repository.js";
import type { IndustrySavePayload } from "./industry.types.js";
export class IndustryService {
  constructor(private readonly repository = new IndustryRepository()) {}
  listIndustries() {
    return this.repository.list();
  }
  createIndustry(input: IndustrySavePayload) {
    validate(input);
    return this.repository.create(input);
  }
  updateIndustry(id: string, input: IndustrySavePayload) {
    validate(input);
    return this.repository.update(Number(id), input);
  }
}
function validate(input: IndustrySavePayload) {
  if (!input.code.trim() || !input.name.trim())
    throw new Error("Industry code and name are required.");
}
