import { useQuery } from "@tanstack/react-query";
import {
  getPaymentContext,
  listPaymentActivity,
  listPaymentAllocations,
  listPaymentContacts,
  listPaymentLedgers,
  listPayments,
  listPaymentsPage
} from "./payment.services";
export const paymentQueryKey = ["billing", "payments"] as const;
export function usePaymentList() {
  return useQuery({ queryFn: listPayments, queryKey: paymentQueryKey });
}
export function usePaymentPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listPaymentsPage(query),
    queryKey: [...paymentQueryKey, "page", query]
  });
}
export function usePaymentContext() {
  return useQuery({ queryFn: getPaymentContext, queryKey: [...paymentQueryKey, "context"] });
}
export function usePaymentActivity(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => listPaymentActivity(id),
    queryKey: [...paymentQueryKey, id, "activity"]
  });
}
export function usePaymentFormLookups(supplierId: number) {
  const contacts = useQuery({
    queryFn: listPaymentContacts,
    queryKey: [...paymentQueryKey, "contacts"]
  });
  const ledgers = useQuery({
    queryFn: listPaymentLedgers,
    queryKey: [...paymentQueryKey, "ledgers"]
  });
  const allocations = useQuery({
    enabled: supplierId > 0,
    queryFn: () => listPaymentAllocations(supplierId),
    queryKey: [...paymentQueryKey, "allocations", supplierId]
  });
  return { allocations, contacts, ledgers };
}
