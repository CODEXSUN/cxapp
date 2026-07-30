import { useQuery } from "@tanstack/react-query";
import {
  getExportSale,
  getExportSaleContext,
  listExportSales,
  listExportSalesPage
} from "./export-sales.services";

export function useExportSalesList() {
  return useQuery({
    queryFn: listExportSales,
    queryKey: ["billing", "exportSales"]
  });
}
export function useExportSalesPage(query: {
  customer: string;
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listExportSalesPage(query),
    queryKey: ["billing", "exportSales", "page", query]
  });
}

export const useExportSaleList = useExportSalesList;

export function useExportSaleRecord(id: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(id) && enabled,
    queryFn: () => getExportSale(id!),
    queryKey: ["billing", "exportSales", id]
  });
}

export function useExportSaleContext() {
  return useQuery({
    queryFn: getExportSaleContext,
    queryKey: ["billing", "exportSales", "context"]
  });
}
