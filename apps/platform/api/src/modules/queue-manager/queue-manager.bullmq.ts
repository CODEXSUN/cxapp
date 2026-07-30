import { createHash } from "node:crypto";
import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../../env.js";
import type { QueueJobRecord } from "./queue-manager.types.js";

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

export async function publishBullMqJob(job: QueueJobRecord) {
  const queue = queueFor(job.queueName);
  const options: JobsOptions = {
    attempts: job.maxAttempts,
    backoff: { delay: 5000, type: "exponential" },
    jobId: bullMqJobId(job),
    priority: job.priority,
    removeOnComplete: false,
    removeOnFail: false
  };
  await queue.add(job.jobName, { queueJobId: job.id, ...job.payload }, options);
}

function bullMqJobId(job: QueueJobRecord) {
  return createHash("sha256")
    .update(`${job.idempotencyKey ?? job.uuid}:${job.attempts}`)
    .digest("hex");
}

export function startBullMqWorker(
  queueName: string,
  run: (queueJobId: number) => Promise<unknown>
) {
  if (workers.has(queueName)) return null;
  const worker = new Worker(
    queueName,
    async (job) => {
      const queueJobId = Number(job.data?.queueJobId);
      if (!Number.isInteger(queueJobId) || queueJobId <= 0) {
        throw new Error("BullMQ job is missing queueJobId.");
      }
      return run(queueJobId);
    },
    { connection: redisConnectionOptions() }
  );
  workers.set(queueName, worker);
  return worker;
}

export async function probeBullMq() {
  const queue = new Queue(`codexsun-probe-${process.pid}`, {
    connection: redisConnectionOptions()
  });
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      queue.waitUntilReady(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis connection probe timed out.")), 3000);
      })
    ]);
    return { connected: true as const };
  } finally {
    if (timer) clearTimeout(timer);
    await queue.close().catch(() => undefined);
  }
}

export async function closeBullMq() {
  for (const worker of workers.values()) await worker.close();
  for (const queue of queues.values()) await queue.close();
  workers.clear();
  queues.clear();
}

function queueFor(queueName: string) {
  const existing = queues.get(queueName);
  if (existing) return existing;
  const queue = new Queue(queueName, { connection: redisConnectionOptions() });
  queues.set(queueName, queue);
  return queue;
}

function redisConnectionOptions() {
  const url = new URL(env.CODEXSUN_REDIS_URL);
  return {
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0,
    host: url.hostname || "127.0.0.1",
    maxRetriesPerRequest: null,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined
  };
}
