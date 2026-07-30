import { z } from "zod";

export const accessPermissionSchema = z.object({
  description: z.string(),
  key: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["active", "inactive"])
});
export const accessRoleSchema = z.object({
  description: z.string(),
  key: z.string().min(1),
  label: z.string().min(1),
  permissionKeysText: z.string(),
  status: z.enum(["active", "inactive"])
});
export const accessUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  roleKey: z.string().min(1),
  status: z.enum(["active", "inactive", "suspended"])
});
export function normalizeAccessKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, ".");
}
