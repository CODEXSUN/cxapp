import { billingApiGet, billingApiPut } from "../../shared/api/billing-api";
import type { BillingSettings } from "./settings.types";

export async function getBillingSettings() {
  return billingApiGet<BillingSettings>("/billing/settings");
}

export async function saveBillingSettings(payload: BillingSettings) {
  return billingApiPut<BillingSettings>("/billing/settings", payload);
}

export function getDocumentSettings() {
  return billingApiGet<BillingSettings["numbering"]>("/billing/document-settings");
}

export function saveDocumentSettings(payload: BillingSettings["numbering"]) {
  return billingApiPut<BillingSettings["numbering"]>("/billing/document-settings", payload);
}

export const getSalesSettings = getBillingSettings;
export const saveSalesSettings = saveBillingSettings;
