import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import {
  getQuotation,
  getQuotationContext,
  listQuotations,
  listQuotationsPage
} from "./quotation.services";
import type { QuotationPageResult } from "./quotation.types";

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
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<QuotationPageResult>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listQuotationsPage(request, signal),
    queryKey: ["billing", "quotations", "page", request]
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
