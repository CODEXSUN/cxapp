import { z } from "zod";

export const platformActivitySchema = z.object({
  action: z.string().min(1),
  moduleKey: z.string().min(1),
  recordLabel: z.string().min(1)
});

export function activityLabel(value: string) {
  return value
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
