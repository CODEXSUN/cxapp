import { z } from "zod";
export const workOrderSchema = z.object({ code: z.string().min(1), name: z.string().min(1) });
