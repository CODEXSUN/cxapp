import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import {
  getExportSale,
  getExportSaleContext,
  listExportSales,
  listExportSalesPage
} from "./export-sales.services";
import type { ExportSalePageResult } from "./export-sales.types";

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
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<ExportSalePageResult>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listExportSalesPage(request, signal),
    queryKey: ["billing", "exportSales", "page", request]
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
