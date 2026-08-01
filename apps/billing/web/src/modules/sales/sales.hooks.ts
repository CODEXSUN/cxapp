import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import { getSale, getSaleContext, listSales, listSalesPage } from "./sales.services";
import type { SalePageResult } from "./sales.types";

export function useSalesList() {
  return useQuery({
    queryFn: listSales,
    queryKey: ["billing", "sales"]
  });
}

export const useSaleList = useSalesList;

export function useSalesPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<SalePageResult>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listSalesPage(request, signal),
    queryKey: ["billing", "sales", "page", request]
  });
}

export function useSaleRecord(id: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(id) && enabled,
    queryFn: () => getSale(id!),
    queryKey: ["billing", "sales", id]
  });
}

export function useSaleContext() {
  return useQuery({
    queryFn: getSaleContext,
    queryKey: ["billing", "sales", "context"]
  });
}
