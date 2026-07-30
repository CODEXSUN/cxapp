import { useQuery } from "@tanstack/react-query";
import { listPaymentTerms } from "./payment-terms.services";
import type { PaymentTermsListFilters } from "./payment-terms.types";

export const paymentTermsQueryKey = ["core", "common", "others", "payment-terms"] as const;
export function usePaymentTerms(filters: PaymentTermsListFilters = {}) {
  return useQuery({
    queryFn: () => listPaymentTerms(filters),
    queryKey: [...paymentTermsQueryKey, filters.search ?? ""]
  });
}
