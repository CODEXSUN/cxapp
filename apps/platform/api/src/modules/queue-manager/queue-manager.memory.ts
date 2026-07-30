const pendingJobIds = new Set<number>();

export function enqueueMemoryJob(id: number) {
  if (Number.isInteger(id) && id > 0) pendingJobIds.add(id);
}

export function removeMemoryJob(id: number) {
  pendingJobIds.delete(id);
}

export function nextMemoryJobId() {
  const id = pendingJobIds.values().next().value as number | undefined;
  if (id) pendingJobIds.delete(id);
  return id ?? null;
}

export function primeMemoryJobs(ids: number[]) {
  for (const id of ids) enqueueMemoryJob(id);
}

export function memoryPendingCount() {
  return pendingJobIds.size;
}
