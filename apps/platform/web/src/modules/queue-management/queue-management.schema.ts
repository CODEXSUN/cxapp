import { z } from "zod";

export const queueJobActionSchema = z.object({
  id: z.number().int().positive()
});

export function queueJobAction(id: number) {
  return queueJobActionSchema.parse({ id });
}

export const queueFiltersSchema = z.object({
  correlationId: z.string().trim().max(120).default(""),
  queueName: z.string().trim().max(80).default(""),
  status: z.enum(["", "cancelled", "completed", "failed", "pending", "running"]).default(""),
  tenantId: z.string().trim().max(80).default("")
});
