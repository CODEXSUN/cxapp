import { loadEnv } from "@codexsun/framework/env";
import { z } from "zod";

const envSchema = z.object({
  PLATFORM_API_URL: z.string().url("PLATFORM_API_URL must be a valid URL"),
  DB_HOST: z.string().min(1),
  DB_MASTER_NAME: z.string().min(1, "DB_MASTER_NAME is required"),
  DB_PASSWORD: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1, "DB_USER is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  NODE_ENV: z.enum(["development", "test", "staging", "production"])
});

export const env = loadEnv(envSchema);
