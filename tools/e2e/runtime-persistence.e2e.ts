import assert from "node:assert/strict";
import {
  closeAllBillingDatabases,
  getBillingDatabase
} from "../../apps/billing/api/src/database/billing-database.js";
import {
  BillingDatabaseEventPublisher,
  BillingDatabaseQueueAdapter
} from "../../apps/billing/api/src/modules/runtime-persistence/runtime-persistence.repository.js";
import {
  closePlatformDatabase,
  migratePlatformDatabase
} from "../../apps/platform/api/src/database/platform-database.js";
import { AuthLoginAttemptRepository } from "../../apps/platform/api/src/auth/auth-login-attempt.repository.js";
import { env } from "../../apps/platform/api/src/env.js";

const databaseName = env.DEFAULT_TENANT_DB_NAME;
const marker = `runtime-persistence:${Date.now()}`;
const authKey = `127.0.0.1:test:${marker}`;

try {
  const events = new BillingDatabaseEventPublisher();
  const queue = new BillingDatabaseQueueAdapter();
  await events.publish({
    correlationId: marker,
    eventName: "billing.persistence.probe",
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    payload: { marker },
    sourceModule: "billing.persistence-test",
    tenant: { tenantId: databaseName }
  });
  await queue.enqueue("billing.persistence-test", {
    idempotencyKey: marker,
    jobName: "billing.persistence.probe",
    payload: { marker },
    sourceModule: "billing.persistence-test",
    tenantId: databaseName
  });
  await closeAllBillingDatabases();

  const restartedBilling = await getBillingDatabase(databaseName);
  const persistedEvent = await restartedBilling
    .selectFrom("billing_domain_events")
    .select(["uuid"])
    .where("correlation_id", "=", marker)
    .executeTakeFirst();
  const persistedJob = await restartedBilling
    .selectFrom("billing_outbox_jobs")
    .select(["status", "uuid"])
    .where("idempotency_key", "=", marker)
    .executeTakeFirst();
  assert.match(persistedEvent?.uuid ?? "", /^[a-f0-9]{8}$/);
  assert.match(persistedJob?.uuid ?? "", /^[a-f0-9]{8}$/);
  assert.equal(persistedJob?.status, "pending");

  await migratePlatformDatabase();
  const attempts = new AuthLoginAttemptRepository();
  for (let count = 0; count < 5; count += 1) await attempts.recordFailure(authKey);
  await closePlatformDatabase();
  assert.equal(await new AuthLoginAttemptRepository().isRateLimited(authKey), true);

  console.log("Billing outbox/event and auth-throttle restart-persistence verification passed.");
} finally {
  const billing = await getBillingDatabase(databaseName).catch(() => null);
  if (billing) {
    await billing
      .deleteFrom("billing_domain_events")
      .where("correlation_id", "=", marker)
      .execute()
      .catch(() => undefined);
    await billing
      .deleteFrom("billing_outbox_jobs")
      .where("idempotency_key", "=", marker)
      .execute()
      .catch(() => undefined);
  }
  await new AuthLoginAttemptRepository().clear(authKey).catch(() => undefined);
  await Promise.all([closeAllBillingDatabases(), closePlatformDatabase()]);
}
