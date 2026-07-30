import { z } from "zod";
export const ledgerSchema = z.object({
  ledgerGroupId: z.number().int().positive("Ledger group is required."),
  name: z.string().trim().min(1, "Ledger name is required.").max(200),
  status: z.enum(["active", "inactive"])
});
