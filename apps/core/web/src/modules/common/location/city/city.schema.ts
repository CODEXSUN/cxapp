import { z } from "zod";
export const citySchema = z.object({
  districtId: z.number().int().positive("District is required."),
  name: z.string().trim().min(1, "City name is required.").max(200),
  sortOrder: z.number().int().min(0),
  status: z.enum(["active", "inactive"])
});
