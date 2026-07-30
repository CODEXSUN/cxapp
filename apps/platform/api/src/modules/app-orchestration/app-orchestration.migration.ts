export async function migrateAppOrchestrationModule() {
  return {
    migrate: false,
    reason: "Runtime state is process-local and contains no business data."
  };
}
