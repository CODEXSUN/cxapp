import { useQuery } from "@tanstack/react-query";
import { billingApiGet } from "../api/billing-api";

type BillingAccess = {
  canEditEntries: boolean;
  canEditFinalizedEntries: boolean;
};

export const billingAccessQueryKey = ["billing", "access"] as const;

export function useBillingAccess() {
  return useQuery({
    queryFn: () => billingApiGet<BillingAccess>("/billing/access"),
    queryKey: billingAccessQueryKey,
    staleTime: 60_000
  });
}

export function canEditBillingEntry(
  status: string,
  canEditEntries: boolean,
  canEditFinalizedEntries: boolean
) {
  return canEditEntries && (status === "draft" || canEditFinalizedEntries);
}
