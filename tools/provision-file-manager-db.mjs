#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createConnection } from "mysql2/promise";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

try {
  await provisionFileManagerDatabase();
  console.info("  ok File Manager MariaDB account and database are ready");
} catch (error) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "ERROR";
  console.error(`File Manager MariaDB provisioning failed (${code}).`);
  console.error("Verify DB_* administrator access and FILE_MANAGER_DB_* values in .env.");
  process.exitCode = 1;
}

async function provisionFileManagerDatabase() {
  if (!existsSync(envPath)) {
    throw new Error("Missing .env. Run npm run env:configure before provisioning File Manager.");
  }
  process.loadEnvFile(envPath);

  const database = identifier("FILE_MANAGER_DB_NAME");
  const user = identifier("FILE_MANAGER_DB_USER");
  const password = requiredEnv("FILE_MANAGER_DB_PASSWORD");
  const admin = await createConnection({
    host: requiredEnv("DB_HOST"),
    password: requiredEnv("DB_PASSWORD"),
    port: positiveInteger("DB_PORT"),
    user: requiredEnv("DB_USER")
  });

  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    for (const host of ["localhost", "127.0.0.1", "%"]) {
      await reconcileUser(admin, user, password, host, database);
    }
    await admin.query("FLUSH PRIVILEGES");
  } finally {
    await admin.end();
  }

  const fileManager = await createConnection({
    database,
    host: requiredEnv("FILE_MANAGER_DB_HOST"),
    password,
    port: positiveInteger("FILE_MANAGER_DB_PORT"),
    user
  });
  try {
    await fileManager.query("SELECT 1");
  } finally {
    await fileManager.end();
  }
}

async function reconcileUser(connection, userName, userPassword, host, databaseName) {
  const account = `'${sqlValue(userName)}'@'${sqlValue(host)}'`;
  const secret = sqlValue(userPassword);
  await connection.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY '${secret}'`);
  await connection.query(`ALTER USER ${account} IDENTIFIED BY '${secret}'`);
  await connection.query(`GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO ${account}`);
}

function identifier(name) {
  const value = requiredEnv(name);
  if (!/^[A-Za-z0-9_]+$/u.test(value)) {
    throw new Error(`${name} may contain only letters, numbers, and underscores.`);
  }
  return value;
}

function positiveInteger(name) {
  const value = Number(requiredEnv(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.`);
  return value;
}

function sqlValue(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "''");
}
