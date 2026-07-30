import { useQuery } from "@tanstack/react-query";
import {
  getPurchase,
  getPurchaseContext,
  listPurchases,
  listPurchasesPage
} from "./purchase.services";

export function usePurchaseList() {
  return useQuery({
    queryFn: listPurchases,
    queryKey: ["billing", "purchases"]
  });
}
export function usePurchasePage(query: {
  customer: string;
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listPurchasesPage(query),
    queryKey: ["billing", "purchases", "page", query]
  });
}

export function usePurchaseRecord(id: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(id) && enabled,
    queryFn: () => getPurchase(id!),
    queryKey: ["billing", "purchases", id]
  });
}

export function usePurchaseContext() {
  return useQuery({
    queryFn: getPurchaseContext,
    queryKey: ["billing", "purchases", "context"]
  });
}
