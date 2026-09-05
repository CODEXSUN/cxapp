import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import {
  getPurchase,
  getPurchaseContext,
  listPurchases,
  listPurchasesPage
} from "./purchase.services";
import type { PurchasePageResult } from "./purchase.types";

export function usePurchaseList() {
  return useQuery({
    queryFn: listPurchases,
    queryKey: ["billing", "purchases"]
  });
}
export function usePurchasePage(query: {
  customer: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<PurchasePageResult>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listPurchasesPage(request, signal),
    queryKey: ["billing", "purchases", "page", request]
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
