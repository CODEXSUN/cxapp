import { z } from "zod";

const appId = z.enum(["application", "billing", "mail", "task-manager"]);
const stack = z.enum(["platform", "billing", "mail", "platform-task-manager"]);

export const platformAppSaveSchema = z
  .object({
    alwaysEnabled: z.boolean(),
    appId,
    defaultLanding: z.boolean(),
    description: z.string().trim().min(1).max(2_000),
    label: z.string().trim().min(1).max(160),
    moduleKey: z.string().trim().min(1).max(160),
    stack
  })
  .strict();

export const platformAppSchema = platformAppSaveSchema.extend({
  id: z.number().int().nonnegative(),
  uuid: z.string().min(1)
});

export const numericIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict();

export const platformAppListSchema = z.array(platformAppSchema);
