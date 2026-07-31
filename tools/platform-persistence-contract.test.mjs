import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const taskModule = "apps/platform/api/src/modules/task-manager";
const queueModule = "apps/platform/api/src/modules/queue-manager";

test("Task Manager runtime persistence is owned by Platform MariaDB", () => {
  assert.equal(existsSync(`${taskModule}/task-manager.store.ts`), false);
  assert.equal(existsSync(`${taskModule}/task-manager.lookup-store.ts`), false);

  const repository = readFileSync(`${taskModule}/task-manager.repository.ts`, "utf8");
  const migration = readFileSync(`${taskModule}/task-manager.migration.ts`, "utf8");
  const seed = readFileSync(`${taskModule}/task-manager.seed.ts`, "utf8");
  const routes = readFileSync(`${taskModule}/task-manager.routes.ts`, "utf8");
  const tenantApps = readFileSync("apps/platform/api/src/database/tenant-app-database.ts", "utf8");
  const appRegistry = readFileSync("apps/platform/web/src/app/app-registry.ts", "utf8");
  const tenantDesk = readFileSync("apps/platform/web/src/desks/tenant/AppDesk.tsx", "utf8");

  assert.match(repository, /task_manager_todos/);
  assert.match(repository, /task_manager_lookups/);
  assert.doesNotMatch(repository, /writeFile|TaskManagerJsonStore|TaskManagerLookupStore/);
  assert.match(migration, /\.createTable\("task_manager_todos"\)/);
  assert.match(migration, /\.createTable\("task_manager_lookups"\)/);
  assert.match(seed, /system:legacy-json-import/);
  assert.doesNotMatch(seed, /writeFile/);
  assert.match(routes, /tenantAccessContext/);
  assert.match(routes, /platform\.task-manager\.access/);
  assert.match(routes, /app_module_settings/);
  assert.match(tenantApps, /migrateTaskManagerModule\(database\)/);
  assert.match(tenantApps, /seedTaskManagerModule\(database/);
  assert.match(tenantApps, /rollbackTaskManagerModule\(database\)/);
  assert.match(appRegistry, /moduleKey: "platform\.task-manager"/);
  assert.match(tenantDesk, /<TaskManagerWorkspace desk="tenant"/);
});

test("Queue Manager offers only durable persistence backends", () => {
  assert.equal(existsSync(`${queueModule}/queue-manager.memory.ts`), false);
  for (const file of [
    `${queueModule}/queue-manager.types.ts`,
    `${queueModule}/queue-manager.service.ts`,
    `${queueModule}/queue-manager.routes.ts`,
    "apps/platform/web/src/modules/queue-management/queue-management.schema.ts"
  ]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /["']memory["']/);
  }
});

test("Billing runtime events and follow-up jobs use tenant database adapters", () => {
  const database = readFileSync("apps/billing/api/src/database/billing-database.ts", "utf8");
  assert.match(database, /billing_domain_events/);
  assert.match(database, /billing_outbox_jobs/);

  for (const file of [
    "apps/billing/api/src/modules/quotation/quotation.service.ts",
    "apps/billing/api/src/modules/purchase/purchase.service.ts",
    "apps/billing/api/src/modules/payment/payment.service.ts",
    "apps/billing/api/src/modules/dashboard/dashboard.service.ts"
  ]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /InMemoryEventPublisher|InMemoryQueueAdapter/);
    assert.match(source, /BillingDatabase(EventPublisher|QueueAdapter)/);
  }
});

test("sign-in throttling is database-backed and stores only a hashed attempt key", () => {
  const routes = readFileSync("apps/platform/api/src/auth/auth.routes.ts", "utf8");
  const repository = readFileSync(
    "apps/platform/api/src/auth/auth-login-attempt.repository.ts",
    "utf8"
  );
  assert.doesNotMatch(routes, /new Map/);
  assert.match(routes, /AuthLoginAttemptRepository/);
  assert.match(repository, /createHash\("sha256"\)/);
  assert.match(repository, /auth_login_attempts/);
});

test("production framework contracts do not ship process-memory persistence adapters", () => {
  assert.doesNotMatch(
    readFileSync("packages/framework/src/events/contracts.ts", "utf8"),
    /InMemoryEventPublisher/
  );
  assert.doesNotMatch(
    readFileSync("packages/framework/src/queue/contracts.ts", "utf8"),
    /InMemoryQueueAdapter/
  );
});
