import { useQuery } from "@tanstack/react-query";
import {
  getQuotation,
  getQuotationContext,
  listQuotations,
  listQuotationsPage
} from "./quotation.services";

export function useQuotationList() {
  return useQuery({
    queryFn: listQuotations,
    queryKey: ["billing", "quotations"]
  });
}

export function useQuotationPage(query: {
  customer: string;
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listQuotationsPage(query),
    queryKey: ["billing", "quotations", "page", query]
  });
}

export function useQuotationRecord(id: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(id) && enabled,
    queryFn: () => getQuotation(id!),
    queryKey: ["billing", "quotations", id]
  });
}

export function useQuotationContext() {
  return useQuery({
    queryFn: getQuotationContext,
    queryKey: ["billing", "quotations", "context"]
  });
}
