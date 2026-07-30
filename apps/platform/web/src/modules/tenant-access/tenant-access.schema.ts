import { z } from "zod";

export const tenantAccessSummarySchema = z.object({
  enabledModuleKeys: z.array(z.string()),
  tenantId: z.number().int().positive(),
  tenantName: z.string().min(1)
});

export function moduleCount(keys: string[]) {
  return new Set(keys).size;
}
