import { z } from "zod";
export const appRegistrySchema = z.object({
  alwaysEnabled: z.boolean(),
  appId: z.string().min(1),
  defaultLanding: z.boolean(),
  description: z.string(),
  label: z.string().min(1),
  moduleKey: z.string().min(1),
  stack: z.enum(["platform", "billing", "mail", "platform-task-manager"])
});
