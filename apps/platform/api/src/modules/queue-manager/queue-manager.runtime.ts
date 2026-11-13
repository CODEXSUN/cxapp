import type { FastifyInstance } from "fastify";
import { env } from "../../env.js";
import { closeBullMq, startBullMqWorker } from "./queue-manager.bullmq.js";
import { QueueManagerService } from "./queue-manager.service.js";

let queueWorkerTimer: NodeJS.Timeout | null = null;

export function startQueueManagerWorker(app: FastifyInstance, service = new QueueManagerService()) {
  if (env.CXAPP_QUEUE_WORKER_ENABLED !== "1" || queueWorkerTimer) {
    return;
  }
  let running = false;
  let cleanupTicks = 0;
  const tick = () => {
    if (running) return;
    running = true;
    void service
      .currentBackend()
      .then(async (backend) => {
        if (backend === "bullmq-redis") {
          for (const queueName of ["maintenance", "mail", "system", "reports"]) {
            startBullMqWorker(queueName, (queueJobId) =>
              service.runJob(queueJobId, { fromWorker: true })
            );
          }
          return null;
        }
        await closeBullMq();
        return service.runNextJob();
      })
      .then(async () => {
        cleanupTicks += 1;
        if (cleanupTicks >= 120) {
          cleanupTicks = 0;
          await service.cleanupRetainedJobs();
        }
      })
      .catch((error) => app.log.error({ error }, "queue worker failed"))
      .finally(() => {
        running = false;
      });
  };
  queueWorkerTimer = setInterval(tick, env.CXAPP_QUEUE_WORKER_INTERVAL_MS);
  tick();
  queueWorkerTimer.unref();
  app.addHook("onClose", async () => {
    if (queueWorkerTimer) {
      clearInterval(queueWorkerTimer);
      queueWorkerTimer = null;
    }
    await closeBullMq();
  });
}
