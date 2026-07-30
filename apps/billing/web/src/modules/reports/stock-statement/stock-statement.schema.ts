import { z } from "zod";

export const stockStatementFiltersSchema = z
  .object({
    from: z.string(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(10).max(200),
    search: z.string().max(191),
    to: z.string()
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date cannot be after To date.",
    path: ["to"]
  });
