import { z } from "zod";
export const ledgerGroupSchema = z.object({
  name: z.string().trim().min(1, "Ledger group name is required.").max(200),
  status: z.enum(["active", "inactive"])
});
