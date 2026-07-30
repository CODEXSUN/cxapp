import { z } from "zod";
export const orchestratedAppIdSchema = z.enum(["platform", "core", "billing"]);
