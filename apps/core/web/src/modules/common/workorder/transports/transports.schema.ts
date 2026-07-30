import { z } from "zod";

export const transportsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  gst: z.string().trim().max(200).nullable().optional(),
  vehicleNo: z.string().trim().max(200).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  contactNo: z.string().trim().max(200).nullable().optional(),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
