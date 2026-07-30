import { z } from "zod";

export const databaseActionSchema = z.object({
  backupId: z.string().trim().max(80).optional(),
  note: z.string().trim().max(240).optional()
});

export function maintenanceNote(action: string) {
  return databaseActionSchema.parse({ note: `${action} requested from Super Admin` });
}
