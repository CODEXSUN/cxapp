import { getCompanyId } from "../api/tenant-context";

export type BillingLookupKind =
  | "address-types"
  | "cities"
  | "colours"
  | "contact-types"
  | "contacts"
  | "countries"
  | "districts"
  | "hsn-codes"
  | "pincodes"
  | "product-categories"
  | "products"
  | "sizes"
  | "states"
  | "taxes"
  | "transports"
  | "units"
  | "work-orders";

const BILLING_LOOKUP_STALE_TIME = 5 * 60 * 1_000;

export function billingLookupQuery(kind: BillingLookupKind) {
  const companyId = getCompanyId();
  return {
    enabled: companyId !== null,
    queryKey: billingLookupQueryKey(kind, companyId),
    staleTime: BILLING_LOOKUP_STALE_TIME
  } as const;
}

export function billingLookupQueryKey(
  kind: BillingLookupKind,
  companyId: number | null = getCompanyId()
) {
  return ["billing", "lookups", companyId, kind] as const;
}
