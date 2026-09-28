import { z } from "zod";

export const customerSummaryFiltersSchema = z.object({
  search: z.string().trim().max(191)
});
