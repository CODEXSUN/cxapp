import { syncStorageManagerModule } from "./storage-manager.sync.js";

export async function processStorageManagerJob(job: { name?: string } = {}) {
  const result = await syncStorageManagerModule();
  return {
    jobName: job.name ?? "storage-manager.sync",
    processed: true,
    result
  };
}

export async function runStorageManagerWorker() {
  return processStorageManagerJob({ name: "storage-manager.sync" });
}
