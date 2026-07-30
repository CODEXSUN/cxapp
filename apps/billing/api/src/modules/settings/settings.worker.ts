export type BillingSettingsWorkerJob = {
  databaseName: string;
  name: "billing-settings.sync" | "billing-settings.defaults";
};

export async function processBillingSettingsJob(job: BillingSettingsWorkerJob) {
  return {
    job,
    processed: true,
    processedAt: new Date().toISOString()
  };
}
