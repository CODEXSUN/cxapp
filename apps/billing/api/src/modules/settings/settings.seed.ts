import { defaultBillingSalesSettings } from "./settings.types.js";

export async function seedBillingSettingsModule() {
  return {
    seeded: true,
    settings: defaultBillingSalesSettings,
    source: "billing-defaults"
  };
}
