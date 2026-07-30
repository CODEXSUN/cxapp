export const databaseMaintenanceEvents = {
  changed: "platform.database-maintenance.changed"
} as const;
export function createDatabaseMaintenanceEvent(operation: string, databaseName: string) {
  return {
    name: databaseMaintenanceEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { databaseName, operation },
    version: 1
  };
}
