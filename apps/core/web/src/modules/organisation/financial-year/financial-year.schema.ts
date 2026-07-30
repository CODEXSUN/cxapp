import { z } from "zod";
export const financialYearSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    startDate: z.string().date("Start date is required."),
    endDate: z.string().date("End date is required."),
    isCurrent: z.boolean(),
    status: z.enum(["active", "inactive"])
  })
  .refine((value) => value.startDate < value.endDate, {
    message: "End date must be after start date.",
    path: ["endDate"]
  });
