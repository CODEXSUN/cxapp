import { useQuery } from "@tanstack/react-query";
import { getSale, getSaleContext, listSales, listSalesPage } from "./sales.services";

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
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listSalesPage(query),
    queryKey: ["billing", "sales", "page", query]
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
