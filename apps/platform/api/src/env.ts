import { loadEnv, resolvePlatformRuntime } from "@cxapp/framework/env";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]),
    AUTH_MODE: z.enum(["cookie", "jwt", "hybrid"]),
    AUTH_SESSION_RENEWAL_HOURS: z.coerce.number().int().positive(),
    AUTH_SESSION_TTL_HOURS: z.coerce.number().int().positive().max(720),
    PLATFORM_API_PORT: z.coerce.number().int().positive(),
    PLATFORM_WEB_PORT: z.coerce.number().int().positive(),
    PLATFORM_WEB_ORIGIN: z.string().url("PLATFORM_WEB_ORIGIN must be a valid URL"),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive(),
    DB_USER: z.string().min(1, "DB_USER is required"),
    DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
    DB_DRIVER: z.enum(["mariadb", "mysql2"]),
    DB_MASTER_NAME: z.string().min(1, "DB_MASTER_NAME is required"),
    CXAPP_DB_FRESH_ON_START: z.enum(["0", "1"]),
    CXAPP_DB_RESET_CONFIRM: z.string(),
    CXAPP_ALLOW_PRODUCTION_DB_RESET: z.enum(["0", "1"]),
    CXAPP_BACKUP_DIR: z.string().min(1),
    CXAPP_QUEUE_BACKEND: z.preprocess(
      (value) => (value === "memory" ? "database" : value),
      z.enum(["database", "bullmq-redis"])
    ),
    CXAPP_QUEUE_COMPLETED_RETENTION_DAYS: z.coerce.number().int().positive(),
    CXAPP_QUEUE_FAILED_RETENTION_DAYS: z.coerce.number().int().positive(),
    CXAPP_QUEUE_WORKER_ENABLED: z.enum(["0", "1"]),
    CXAPP_QUEUE_WORKER_INTERVAL_MS: z.coerce.number().int().positive(),
    CXAPP_REDIS_URL: z.string().min(1, "CXAPP_REDIS_URL is required"),
    MAIL_ENABLED: z.enum(["0", "1"]),
    MAIL_SMTP_HOST: z.string(),
    MAIL_SMTP_PORT: z.coerce.number().int().positive(),
    MAIL_SMTP_SECURE: z.enum(["0", "1"]),
    MAIL_USERNAME: z.string(),
    MAIL_PASSWORD: z.string(),
    MAIL_FROM_EMAIL: z.string(),
    MAIL_FROM_NAME: z.string(),
    MAIL_REPLY_TO: z.string(),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().max(1440),
    CXAPP_ALLOW_LIVE_RESTORE: z.enum(["0", "1"]),
    CXAPP_LIVE_RESTORE_CONFIRM: z.string(),
    CXAPP_RESTORE_TEST_DB_NAME: z.string(),
    CXAPP_VERIFIED_BACKUP_ID: z.string(),
    ENABLE_DEFAULT_TENANT_SEED: z.enum(["0", "1"]),
    DEV_AUTO_TENANT_LOGIN: z.enum(["0", "1"]),
    TENANT_DOMAIN_BASE: z.string().min(1),
    DEFAULT_TENANT_ADMIN_EMAIL: z.string(),
    DEFAULT_TENANT_ADMIN_NAME: z.string(),
    DEFAULT_TENANT_ADMIN_PASSWORD: z.string(),
    DEFAULT_TENANT_CORPORATE_ID: z.string(),
    DEFAULT_TENANT_DB_NAME: z.string(),
    DEFAULT_TENANT_DOMAIN: z.string().min(1),
    DEFAULT_TENANT_NAME: z.string().min(1),
    DEFAULT_TENANT_SLUG: z.string(),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    SOFTWARE_ADMIN_EMAIL: z.string(),
    SOFTWARE_ADMIN_NAME: z.string(),
    SOFTWARE_ADMIN_PASSWORD: z.string(),
    SUPER_ADMIN_EMAIL: z.string(),
    SUPER_ADMIN_NAME: z.string(),
    SUPER_ADMIN_PASSWORD: z.string(),
    TENANT_ADMIN_EMAIL: z.string(),
    TENANT_ADMIN_NAME: z.string(),
    TENANT_ADMIN_PASSWORD: z.string(),
    STORAGE_PUBLIC_ROOT: z.string().min(1),
    STORAGE_ROOT: z.string().min(1),
    TASK_MANAGER_JSON_DIR: z.string().min(1)
  })
  .superRefine((value, context) => {
    if (value.MAIL_ENABLED === "1") {
      for (const key of ["MAIL_SMTP_HOST", "MAIL_FROM_EMAIL"] as const) {
        if (!value[key].trim()) {
          context.addIssue({
            code: "custom",
            message: `${key} is required when MAIL_ENABLED=1`,
            path: [key]
          });
        }
      }
    }
    if (value.ENABLE_DEFAULT_TENANT_SEED === "1") {
      for (const key of [
        "DEFAULT_TENANT_ADMIN_EMAIL",
        "DEFAULT_TENANT_ADMIN_NAME",
        "DEFAULT_TENANT_ADMIN_PASSWORD",
        "DEFAULT_TENANT_CORPORATE_ID",
        "DEFAULT_TENANT_DB_NAME",
        "DEFAULT_TENANT_DOMAIN",
        "DEFAULT_TENANT_NAME",
        "DEFAULT_TENANT_SLUG"
      ] as const) {
        if (!value[key].trim()) {
          context.addIssue({
            code: "custom",
            message: `${key} is required when ENABLE_DEFAULT_TENANT_SEED=1`,
            path: [key]
          });
        }
      }
    }
  });

export const env = loadEnv(envSchema);
export const platformRuntime = resolvePlatformRuntime(env);
