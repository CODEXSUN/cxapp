import { z } from "zod";

export const gstStatementFiltersSchema = z
  .object({
    from: z.string(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(10).max(200),
    to: z.string()
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date cannot be after To date.",
    path: ["to"]
  });
