import assert from "node:assert/strict";
import { closePlatformDatabase } from "../../apps/platform/api/src/database/platform-database.js";
import {
  closeBullMq,
  startBullMqWorker
} from "../../apps/platform/api/src/modules/queue-manager/queue-manager.bullmq.js";
import { QueueManagerService } from "../../apps/platform/api/src/modules/queue-manager/queue-manager.service.js";

const service = new QueueManagerService();
const originalBackend = await service.currentBackend();
const actorEmail = "queue-live-test@codexsun.app";
const results: Record<string, string> = {};

try {
  const existingPending = await service.listJobs({ status: "pending" });
  assert.equal(
    existingPending.length,
    0,
    "Queue live test refuses to run while unrelated pending jobs exist."
  );

  await verifyInlineBackend("memory");
  await verifyInlineBackend("database");

  try {
    await service.switchBackend("bullmq-redis", actorEmail);
    startBullMqWorker("system", (queueJobId) => service.runJob(queueJobId, { fromWorker: true }));
    const job = await enqueueProbe("bullmq-redis");
    const completed = await waitForCompletion(job.id, 15_000);
    assert.equal(completed.status, "completed");
    assert.equal(completed.result.echo?.backend, "bullmq-redis");
    results["bullmq-redis"] = "delivered";
  } catch (error) {
    results["bullmq-redis"] = `unavailable: ${errorMessage(error)}`;
    if (process.env.CODEXSUN_QUEUE_LIVE_REQUIRE_REDIS === "1") throw error;
  }

  console.log("Queue backend live verification passed", results);
} finally {
  await closeBullMq().catch(() => undefined);
  await service.switchBackend(originalBackend, actorEmail).catch((error) => {
    console.error("Failed to restore queue backend", error);
    process.exitCode = 1;
  });
  await closePlatformDatabase();
}

async function verifyInlineBackend(backend: "database" | "memory") {
  await service.switchBackend(backend, actorEmail);
  const job = await enqueueProbe(backend);
  assert.ok(job, `${backend} did not persist the probe job.`);
  const completed = await service.runNextJob();
  assert.equal(completed?.id, job.id);
  assert.equal(completed?.status, "completed");
  assert.equal(completed?.result.echo?.backend, backend);
  results[backend] = "delivered";
}

async function enqueueProbe(backend: "bullmq-redis" | "database" | "memory") {
  const job = await service.enqueue({
    correlationId: `queue-live:${backend}:${Date.now()}`,
    idempotencyKey: `queue-live:${backend}:${Date.now()}`,
    jobName: "queue.probe",
    maxAttempts: 2,
    payload: { backend },
    queueName: "system",
    sourceModule: "platform.queue-manager"
  });
  assert.ok(job, `${backend} did not return a persisted queue job.`);
  return job;
}

async function waitForCompletion(id: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await service.findJob(id);
    if (job?.status === "completed") return job;
    if (job?.status === "failed") throw new Error(job.errorMessage ?? "BullMQ probe failed.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("BullMQ probe timed out before database metadata reached completed.");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
