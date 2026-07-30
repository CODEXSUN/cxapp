import { z } from "zod";
export const defaultCompanySchema = z.object({
  companyId: z.number().int().positive("Company is required."),
  financialYearId: z.number().int().positive("Financial year is required."),
  landingApp: z.string().trim().min(2, "Landing app is required.").max(80),
  status: z.enum(["active", "inactive"])
});
