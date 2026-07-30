import { z } from "zod";
export const tenantUserRoleSchema = z.object({
  userId: z.number().int().positive("User is required."),
  roleId: z.number().int().positive("Role is required."),
  status: z.enum(["active", "inactive"])
});
