import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createConnection } from "mysql2/promise";
import { Queue } from "bullmq";
import Fastify from "fastify";
const e = parseEnv(await fs.readFile(".env", "utf8"));
assert.equal(e.DB_HOST, "127.0.0.1");
assert.equal(Number(e.DB_PORT), 3306);
const suffix = randomUUID().replaceAll("-", "").slice(0, 12),
  database = "cxqueue_test_" + suffix,
  prefix = "cxqueue-test-" + suffix;
if (process.env.CXAPP_TEST_REDIS_URL)
  process.env.CXAPP_REDIS_URL = process.env.CXAPP_TEST_REDIS_URL;
process.env.DB_MASTER_NAME = database;
process.env.CXAPP_BULLMQ_PREFIX = prefix;
process.env.CXAPP_QUEUE_BACKEND = "bullmq-redis";
process.env.CXAPP_QUEUE_WORKER_ENABLED = "1";
process.env.CXAPP_QUEUE_WORKER_INTERVAL_MS = "60000";
const c = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: e.DB_USER,
  password: e.DB_PASSWORD
});
await c.query("CREATE DATABASE `" + database + "`");
for (const table of ["queue_jobs", "queue_runtime_settings", "platform_activity"])
  await c.query(
    "CREATE TABLE `" +
      database +
      "`.`" +
      table +
      "` LIKE `" +
      e.DB_MASTER_NAME +
      "`.`" +
      table +
      "`"
  );
const { QueueManagerService } =
  await import("../apps/platform/api/src/modules/queue-manager/queue-manager.service.js");
const { startQueueManagerWorker } =
  await import("../apps/platform/api/src/modules/queue-manager/queue-manager.runtime.js");
const { closePlatformDatabase } =
  await import("../apps/platform/api/src/database/platform-database.js");
const { closeBullMq } =
  await import("../apps/platform/api/src/modules/queue-manager/queue-manager.bullmq.js");
const app = Fastify();
const service = new QueueManagerService();
const u = new URL(process.env.CXAPP_TEST_REDIS_URL || e.CXAPP_REDIS_URL),
  connection = {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: decodeURIComponent(u.password),
    db: Number(u.pathname.slice(1) || 0),
    maxRetriesPerRequest: null
  };
const foreign = new Queue("reports", { connection, prefix: prefix + "-other" });
const queues = ["maintenance", "mail", "system", "reports"].map(
  (name) => new Queue(name, { connection, prefix })
);
try {
  const protectedJob = await foreign.add("not-ours", { queueJobId: 999999 });
  startQueueManagerWorker(app, service);
  await app.ready();
  const start = performance.now();
  const probes = [];
  for (const queueName of ["maintenance", "mail", "system", "reports"]) {
    const job = await service.enqueue({
      queueName,
      jobName: "queue.probe",
      sourceModule: "queue.test",
      payload: { queueName },
      maxAttempts: 1
    });
    assert.ok(job);
    probes.push(job.id);
  }
  const report = await service.enqueue({
    queueName: "reports",
    jobName: "client-artifact.prepare",
    sourceModule: "queue.test",
    payload: { artifactType: "pdf", fileName: "verification.pdf" },
    maxAttempts: 1
  });
  probes.push(report!.id);
  while (performance.now() - start < 10000) {
    const jobs = await Promise.all(probes.map((id) => service.findJob(id)));
    if (jobs.every((j) => j?.status === "completed")) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  for (const id of probes) assert.equal((await service.findJob(id))?.status, "completed");
  const elapsed = performance.now() - start;
  assert.ok(
    elapsed < 5000,
    "Workers must start immediately, not wait the 60-second discovery interval"
  );
  // Aggregates must include jobs older than the UI's newest-100 list window.
  for (let i = 0; i < 105; i++)
    await c.query(
      "INSERT INTO `" +
        database +
        "`.queue_jobs(uuid,queue_name,job_name,source_module,status,payload_json,result_json) VALUES(LOWER(SUBSTRING(MD5(UUID()),1,8)),'system','queue.probe','queue.test','completed','{}','{}')"
    );
  assert.equal((await service.runtimeSettings()).completed, 110);
  assert.equal((await service.listJobs()).length, 100);
  assert.equal((await foreign.getJob(protectedJob.id!))?.id, protectedJob.id);
  console.log(
    JSON.stringify({
      passed: true,
      queues: 4,
      reportsWorker: true,
      artifactJob: true,
      startupAndCompletionMs: elapsed,
      totalCompletedCount: 110,
      foreignNamespaceUntouched: true
    })
  );
} finally {
  await app.close();
  await closeBullMq();
  for (const q of queues) {
    await q.obliterate({ force: true });
    await q.close();
  }
  await foreign.obliterate({ force: true });
  await foreign.close();
  await closePlatformDatabase();
  await c.query("DROP DATABASE `" + database + "`");
  await c.end();
}
