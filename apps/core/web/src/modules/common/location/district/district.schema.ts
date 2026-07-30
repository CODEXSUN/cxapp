import { z } from "zod";
export const districtSchema = z.object({
  stateId: z.number().int().positive("State is required."),
  name: z.string().trim().min(1, "District name is required.").max(200),
  sortOrder: z.number().int().min(0),
  status: z.enum(["active", "inactive"])
});
