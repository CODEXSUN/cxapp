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
  GSP_ENVIRONMENT: z.enum(["sandbox", "production"]),
  GSP_SANDBOX_BASE_URL: z.string().url("GSP_SANDBOX_BASE_URL must be a valid URL"),
  GSP_BASE_URL: z.string().url("GSP_BASE_URL must be a valid URL"),
  GSP_EMAIL: z.string(),
  GSP_USERNAME: z.string(),
  GSP_PASSWORD: z.string(),
  GSP_CLIENT_ID: z.string(),
  GSP_CLIENT_SECRET: z.string(),
  GSP_GSTIN: z.string(),
  GSP_IP_ADDRESS: z.string(),
  NODE_ENV: z.enum(["development", "test", "staging", "production"])
});

export const env = loadEnv(envSchema);
