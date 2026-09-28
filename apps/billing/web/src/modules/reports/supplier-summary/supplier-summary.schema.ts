import { z } from "zod";

export const supplierSummaryFiltersSchema = z.object({
  search: z.string().trim().max(191)
});
