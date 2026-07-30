import { z } from "zod";
export const industrySchema = z.object({
  code: z.string().min(1),
  description: z.string(),
  moduleKeysText: z.string(),
  name: z.string().min(1),
  status: z.enum(["active", "inactive"])
});
