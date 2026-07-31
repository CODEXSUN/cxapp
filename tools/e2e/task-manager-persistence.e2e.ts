import assert from "node:assert/strict";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";
import {
  closePlatformDatabase,
  getPlatformDatabase,
  migratePlatformDatabase
} from "../../apps/platform/api/src/database/platform-database.js";
import {
  assertDatabaseName,
  quoteIdentifier
} from "../../apps/platform/api/src/database/database-utils.js";
import { env } from "../../apps/platform/api/src/env.js";
import {
  migrateTaskManagerModule,
  rollbackTaskManagerModule,
  type TaskManagerDatabase
} from "../../apps/platform/api/src/modules/task-manager/task-manager.migration.js";
import { TaskManagerRepository } from "../../apps/platform/api/src/modules/task-manager/task-manager.repository.js";
import { TaskManagerService } from "../../apps/platform/api/src/modules/task-manager/task-manager.service.js";
import { seedTaskManagerModule } from "../../apps/platform/api/src/modules/task-manager/task-manager.seed.js";

const scope = "super-admin";
const marker = `Persistence probe ${Date.now()}`;
const tenantDatabaseA = assertDatabaseName(`task_mgr_a_${Date.now().toString(36)}`);
const tenantDatabaseB = assertDatabaseName(`task_mgr_b_${Date.now().toString(36)}`);
let todoId = "";
let tenantTodoId = "";
let tenantA: Kysely<TaskManagerDatabase> | null = null;
let tenantB: Kysely<TaskManagerDatabase> | null = null;

try {
  await migratePlatformDatabase();
  await seedTaskManagerModule(getPlatformDatabase());

  const firstProcess = new TaskManagerService();
  const created = await firstProcess.create(scope, {
    description: "Must remain available after the database pool is recreated.",
    priority: "high",
    title: marker
  });
  todoId = created.id;
  assert.match(created.id, /^[a-f0-9]{8}$/);

  const lookups = await firstProcess.listLookups(scope);
  assert.ok(lookups.some((item) => item.kind === "status" && item.value === "open"));
  await closePlatformDatabase();

  const restartedProcess = new TaskManagerService();
  const persisted = (await restartedProcess.list(scope)).find((item) => item.id === todoId);
  assert.equal(persisted?.title, marker);
  const updated = await restartedProcess.status(scope, todoId, "completed");
  assert.equal(updated?.status, "completed");
  await closePlatformDatabase();

  const finalProcess = new TaskManagerService();
  const afterSecondRestart = (await finalProcess.list(scope)).find((item) => item.id === todoId);
  assert.equal(afterSecondRestart?.status, "completed");
  await finalProcess.delete(scope, todoId);
  todoId = "";

  await createProbeDatabases([tenantDatabaseA, tenantDatabaseB]);
  tenantA = openProbeDatabase(tenantDatabaseA);
  tenantB = openProbeDatabase(tenantDatabaseB);
  await Promise.all([migrateTaskManagerModule(tenantA), migrateTaskManagerModule(tenantB)]);
  await Promise.all([
    seedTaskManagerModule(tenantA, {
      importLegacyJson: false,
      scopeKey: "tenant:e2e-a"
    }),
    seedTaskManagerModule(tenantB, {
      importLegacyJson: false,
      scopeKey: "tenant:e2e-b"
    })
  ]);

  const tenantServiceA = new TaskManagerService(new TaskManagerRepository(tenantA));
  const tenantServiceB = new TaskManagerService(new TaskManagerRepository(tenantB));
  const tenantTodo = await tenantServiceA.create(
    "tenant:e2e-a",
    {
      description: "Must persist only in tenant A after its connection is recreated.",
      priority: "urgent",
      title: `Tenant ${marker}`
    },
    "tenant-a@example.test"
  );
  tenantTodoId = tenantTodo.id;
  assert.equal((await tenantServiceB.list("tenant:e2e-b")).length, 0);
  assert.ok(
    (await tenantServiceA.listLookups("tenant:e2e-a")).some(
      (item) => item.kind === "status" && item.value === "open"
    )
  );

  await tenantA.destroy();
  tenantA = openProbeDatabase(tenantDatabaseA);
  const restartedTenantService = new TaskManagerService(new TaskManagerRepository(tenantA));
  assert.equal(
    (await restartedTenantService.list("tenant:e2e-a")).find((item) => item.id === tenantTodoId)
      ?.title,
    `Tenant ${marker}`
  );
  await restartedTenantService.delete("tenant:e2e-a", tenantTodoId);
  tenantTodoId = "";

  await rollbackTaskManagerModule(tenantB);
  assert.equal(
    (await tenantB.introspection.getTables()).some((table) =>
      table.name.startsWith("task_manager_")
    ),
    false
  );

  console.log(
    "Task Manager platform and tenant MariaDB restart-persistence, isolation, and rollback verification passed."
  );
} finally {
  if (todoId) {
    await new TaskManagerService().delete(scope, todoId).catch(() => undefined);
  }
  if (tenantTodoId && tenantA) {
    await new TaskManagerService(new TaskManagerRepository(tenantA))
      .delete("tenant:e2e-a", tenantTodoId)
      .catch(() => undefined);
  }
  await Promise.all([
    tenantA?.destroy().catch(() => undefined),
    tenantB?.destroy().catch(() => undefined)
  ]);
  await dropProbeDatabases([tenantDatabaseA, tenantDatabaseB]);
  await closePlatformDatabase();
}

function openProbeDatabase(database: string) {
  return new Kysely<TaskManagerDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        database,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        timezone: "Z",
        user: env.DB_USER
      })
    })
  });
}

async function createProbeDatabases(databases: string[]) {
  const connection = await createAdminConnection();
  try {
    for (const database of databases) {
      await connection.query(
        `CREATE DATABASE ${quoteIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    }
  } finally {
    await connection.end();
  }
}

async function dropProbeDatabases(databases: string[]) {
  const connection = await createAdminConnection().catch(() => null);
  if (!connection) return;
  try {
    for (const database of databases) {
      await connection
        .query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`)
        .catch(() => undefined);
    }
  } finally {
    await connection.end();
  }
}

function createAdminConnection() {
  return createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER
  });
}
