import { z } from "zod";

export const planAccessSchema = z.object({
  moduleKeys: z.array(z.string().min(1)).min(1)
});

export function normalizePlanAccessKeys(moduleKeys: string[]) {
  return Array.from(new Set(["platform.application", ...moduleKeys.filter(Boolean)])).sort();
}
