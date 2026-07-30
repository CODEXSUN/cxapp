import { z } from "zod";

export const tenantDatabaseActionSchema = z.object({
  backupId: z.string().trim().max(80).optional(),
  note: z.string().trim().max(240).optional(),
  tenantId: z.number().int().positive()
});

export function tenantMaintenanceNote(tenantId: number, action: string) {
  return tenantDatabaseActionSchema.parse({
    note: `${action} requested from Super Admin`,
    tenantId
  });
}
