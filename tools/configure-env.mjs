#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");
const checkOnly = process.argv.includes("--check");
const nonInteractive = process.argv.includes("--non-interactive");
const assignments = process.argv
  .filter((argument) => argument.startsWith("--set="))
  .map((argument) => argument.slice("--set=".length));
const template = parseEnv(readFileSync(examplePath, "utf8"));
const currentText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const current = parseEnv(currentText);

const optionalEmpty = new Set([
  "PLATFORM_WEB_ORIGINS",
  "CODEXSUN_DB_RESET_CONFIRM",
  "CODEXSUN_RESTORE_TEST_DB_NAME",
  "CODEXSUN_LIVE_RESTORE_CONFIRM",
  "MAIL_SMTP_HOST",
  "MAIL_USERNAME",
  "MAIL_PASSWORD",
  "MAIL_FROM_EMAIL",
  "MAIL_REPLY_TO",
  "GSP_EMAIL",
  "GSP_USERNAME",
  "GSP_PASSWORD",
  "GSP_CLIENT_ID",
  "GSP_CLIENT_SECRET",
  "GSP_GSTIN",
  "CODEXSUN_BACKUP_VERIFY_ID"
]);
const interactiveKeys = [
  ["DB_USER", "MariaDB application user", false],
  ["DB_PASSWORD", "MariaDB application password", true],
  ["MARIADB_ADMIN_USER", "MariaDB administrative user", false],
  ["MARIADB_ROOT_PASSWORD", "MariaDB administrative password", true],
  ["REDIS_PASSWORD", "Redis password", true],
  ["MEDIA_ADMIN_USER", "File Browser administrator user", false],
  ["MEDIA_ADMIN_PASSWORD", "File Browser administrator password", true],
  ["SUPER_ADMIN_NAME", "Super administrator name", false],
  ["SUPER_ADMIN_EMAIL", "Super administrator email", false],
  ["SUPER_ADMIN_PASSWORD", "Super administrator password", true],
  ["SOFTWARE_ADMIN_NAME", "Software administrator name", false],
  ["SOFTWARE_ADMIN_EMAIL", "Software administrator email", false],
  ["SOFTWARE_ADMIN_PASSWORD", "Software administrator password", true],
  ["TENANT_ADMIN_NAME", "Tenant administrator name", false],
  ["TENANT_ADMIN_EMAIL", "Tenant administrator email", false],
  ["TENANT_ADMIN_PASSWORD", "Tenant administrator password", true],
  ["DEFAULT_TENANT_ADMIN_NAME", "Default tenant administrator name", false],
  ["DEFAULT_TENANT_ADMIN_EMAIL", "Default tenant administrator email", false],
  ["DEFAULT_TENANT_ADMIN_PASSWORD", "Default tenant administrator password", true]
];
const generatedInfrastructureSecrets = new Set([
  "MARIADB_ROOT_PASSWORD",
  "REDIS_PASSWORD",
  "MEDIA_ADMIN_PASSWORD",
  "JWT_SECRET"
]);

if (!checkOnly) {
  for (const [key, value] of template) {
    if (!current.has(key)) {
      current.set(key, value);
    }
  }
  for (const assignment of assignments) {
    const separator = assignment.indexOf("=");
    const key = separator > 0 ? assignment.slice(0, separator) : "";
    const value = separator > 0 ? assignment.slice(separator + 1) : "";
    if (!template.has(key)) {
      fail(`Unknown .env key in --set assignment: ${key || assignment}`);
    }
    current.set(key, value);
  }

  if (nonInteractive) {
    for (const key of generatedInfrastructureSecrets) {
      if (isMissing(current.get(key))) {
        current.set(key, randomBytes(32).toString("hex"));
      }
    }
  } else {
    if (!stdin.isTTY || !stdout.isTTY) {
      fail(
        "Interactive configuration requires a terminal. Use --non-interactive only when application administrator credentials already exist."
      );
    }
    stdout.write("Press Enter to preserve an existing value. Passwords are never printed.\n\n");
    for (const [key, label, secret] of interactiveKeys) {
      const existing = current.get(key);
      const suffix = isMissing(existing) ? "" : ` [keep ${fingerprint(existing)}]`;
      const answer = secret
        ? await hiddenQuestion(`${label}${suffix}: `)
        : await visibleQuestion(`${label}${suffix}: `);
      if (answer.trim()) {
        current.set(key, answer.trim());
      }
    }
  }

  const redisPassword = current.get("REDIS_PASSWORD");
  if (!isMissing(redisPassword)) {
    current.set(
      "CODEXSUN_REDIS_URL",
      `redis://:${encodeURIComponent(redisPassword)}@codexsun-redis:6379/0`
    );
  }

  validate(current);
  const temporaryPath = `${envPath}.tmp`;
  writeFileSync(temporaryPath, renderEnv(template, current), { mode: 0o600 });
  renameSync(temporaryPath, envPath);
  stdout.write(`Environment configuration saved to ${envPath}.\n`);
} else {
  validate(current);
  stdout.write(`Deployment environment is complete and valid: ${envPath}\n`);
}

function validate(values) {
  const problems = [];
  for (const [key] of template) {
    if (!values.has(key)) {
      problems.push(`${key} is missing`);
    } else if (!optionalEmpty.has(key) && isMissing(values.get(key))) {
      problems.push(`${key} must have a real value`);
    }
  }
  for (const [key, value] of values) {
    if (!optionalEmpty.has(key) && /^change_this/u.test(value.trim())) {
      problems.push(`${key} still contains a placeholder`);
    }
  }
  if (values.get("CODEXSUN_DB_FRESH_ON_START") !== "0") {
    problems.push("CODEXSUN_DB_FRESH_ON_START must be 0 for deployment");
  }
  if (values.get("NODE_ENV") !== "production") {
    problems.push("NODE_ENV must be production for deployment");
  }
  if (values.get("DB_HOST") !== "codexsun-mariadb" || values.get("DB_PORT") !== "3306") {
    problems.push("container deployment requires DB_HOST=codexsun-mariadb and DB_PORT=3306");
  }
  if (
    values.get("PLATFORM_API_HOST") !== "0.0.0.0" ||
    values.get("PLATFORM_WEB_HOST") !== "0.0.0.0"
  ) {
    problems.push(
      "container deployment requires PLATFORM_API_HOST and PLATFORM_WEB_HOST to be 0.0.0.0"
    );
  }
  if (values.get("CODEXSUN_QUEUE_BACKEND") !== "bullmq-redis") {
    problems.push("container deployment requires CODEXSUN_QUEUE_BACKEND=bullmq-redis");
  }
  if (values.get("CODEXSUN_ALLOW_PRODUCTION_DB_RESET") !== "0") {
    problems.push("CODEXSUN_ALLOW_PRODUCTION_DB_RESET must be 0 for deployment");
  }
  if (values.get("DB_MASTER_NAME") === values.get("DEFAULT_TENANT_DB_NAME")) {
    problems.push("DB_MASTER_NAME and DEFAULT_TENANT_DB_NAME must differ");
  }
  if (values.get("MAIL_ENABLED") === "1") {
    for (const key of ["MAIL_SMTP_HOST", "MAIL_FROM_EMAIL"]) {
      if (isMissing(values.get(key))) problems.push(`${key} is required when MAIL_ENABLED=1`);
    }
  }
  if (problems.length) {
    fail(`Deployment environment validation failed:\n- ${problems.join("\n- ")}`);
  }
}

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (!match) continue;
    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

function renderEnv(order, values) {
  const lines = [];
  const emitted = new Set();
  for (const [key] of order) {
    lines.push(`${key}=${quoteEnv(values.get(key) ?? "")}`);
    emitted.add(key);
  }
  for (const [key, value] of values) {
    if (!emitted.has(key)) lines.push(`${key}=${quoteEnv(value)}`);
  }
  return `${lines.join("\n")}\n`;
}

function quoteEnv(value) {
  return /^[A-Za-z0-9_./:@+-]*$/u.test(value) ? value : JSON.stringify(value);
}

function isMissing(value) {
  return !value?.trim() || /^change_this/u.test(value.trim());
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

async function hiddenQuestion(prompt) {
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let value = "";
  try {
    for await (const character of stdin) {
      if (character === "\r" || character === "\n") break;
      if (character === "\u0003") throw new Error("Configuration cancelled.");
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    }
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write("\n");
  }
  return value;
}

async function visibleQuestion(prompt) {
  const reader = createInterface({ input: stdin, output: stdout });
  try {
    return await reader.question(prompt);
  } finally {
    reader.close();
  }
}

function fail(message) {
  console.error(message);
  process.exit(78);
}
