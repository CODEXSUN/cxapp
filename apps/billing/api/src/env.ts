import { loadEnv } from "@codexsun/framework/env";
import { z } from "zod";

const envSchema = z.object({
  PLATFORM_API_URL: z.string().url("PLATFORM_API_URL must be a valid URL"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_MASTER_NAME: z.string().min(1, "DB_MASTER_NAME is required"),
  DB_PASSWORD: z.string(),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1, "DB_USER is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  GSP_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  GSP_SANDBOX_BASE_URL: z.string().url("GSP_SANDBOX_BASE_URL must be a valid URL"),
  GSP_BASE_URL: z.string().url("GSP_BASE_URL must be a valid URL"),
  GSP_EMAIL: z.string().default(""),
  GSP_USERNAME: z.string().default(""),
  GSP_PASSWORD: z.string().default(""),
  GSP_CLIENT_ID: z.string().default(""),
  GSP_CLIENT_SECRET: z.string().default(""),
  GSP_GSTIN: z.string().default(""),
  GSP_IP_ADDRESS: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development")
});

export const env = loadEnv(envSchema);
