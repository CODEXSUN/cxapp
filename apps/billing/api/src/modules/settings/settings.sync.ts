import type { BillingSettings } from "./settings.types.js";

export function shouldSyncBillingSettings(settings: BillingSettings) {
  return settings.layout.useEway || settings.layout.useEinvoice || settings.features.quotation;
}

export function buildBillingSettingsSyncSummary(settings: BillingSettings) {
  return {
    enabled: shouldSyncBillingSettings(settings),
    gstApiMode: settings.gstApiMode
  };
}
