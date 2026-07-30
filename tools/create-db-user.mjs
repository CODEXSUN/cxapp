#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = join(root, ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const client = requiredEnv("MARIADB_CLIENT_PATH");

const adminUser = requiredEnv("MARIADB_ADMIN_USER");
const adminPassword = requiredEnv("MARIADB_ROOT_PASSWORD");
const host = requiredEnv("DB_HOST");
const port = requiredEnv("DB_PORT");
const appUser = requiredEnv("DB_APP_USER");
const appPassword = requiredEnv("DB_APP_PASSWORD");
const masterDb = requiredEnv("DB_MASTER_NAME");
const tenantDb = requiredEnv("DEFAULT_TENANT_DB_NAME");

if ((client.includes("/") || client.includes("\\")) && !existsSync(client)) {
  throw new Error(
    `MariaDB client was not found at ${client}. Set MARIADB_CLIENT_PATH to the executable path or command.`
  );
}

const sql = `
CREATE USER IF NOT EXISTS '${appUser}'@'localhost' IDENTIFIED BY '${appPassword}';
CREATE USER IF NOT EXISTS '${appUser}'@'127.0.0.1' IDENTIFIED BY '${appPassword}';
ALTER USER '${appUser}'@'localhost' IDENTIFIED BY '${appPassword}';
ALTER USER '${appUser}'@'127.0.0.1' IDENTIFIED BY '${appPassword}';
GRANT CREATE, SHOW DATABASES ON *.* TO '${appUser}'@'localhost';
GRANT CREATE, SHOW DATABASES ON *.* TO '${appUser}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${masterDb}\`.* TO '${appUser}'@'localhost';
GRANT ALL PRIVILEGES ON \`${masterDb}\`.* TO '${appUser}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${tenantDb}\`.* TO '${appUser}'@'localhost';
GRANT ALL PRIVILEGES ON \`${tenantDb}\`.* TO '${appUser}'@'127.0.0.1';
FLUSH PRIVILEGES;
`;

const sqlPath = join(root, ".codexsun-create-db-user.sql");
writeFileSync(sqlPath, sql);

const args = ["-h", host, "-P", port, "-u", adminUser];

if (adminPassword) {
  args.push(`-p${adminPassword}`);
}

args.push("--default-character-set=utf8mb4", "-e", `source ${sqlPath.replace(/\\/g, "/")}`);

try {
  execFileSync(client, args, {
    stdio: "inherit"
  });
  console.log(`MariaDB application user ${appUser} was reconciled from .env.`);
} finally {
  rmSync(sqlPath, { force: true });
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Create .env from .env.example and set ${name} before running this helper.`
    );
  }

  return value;
}
