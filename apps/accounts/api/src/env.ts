import { loadEnv, platformApiUrl } from "@cxapp/framework/env";
import { z } from "zod";

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_MASTER_NAME: z.string().min(1, "DB_MASTER_NAME is required"),
  DB_PASSWORD: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1, "DB_USER is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  NODE_ENV: z.enum(["development", "test", "staging", "production"]),
  PLATFORM_API_PORT: z.coerce.number().int().positive()
});

export const env = loadEnv(envSchema);
export const platformApiBaseUrl = platformApiUrl(env.PLATFORM_API_PORT);