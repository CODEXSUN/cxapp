import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@cxapp/ui";
import {
  getReceiptContext,
  listReceiptActivity,
  listReceiptAllocations,
  listReceiptContacts,
  listReceiptLedgers,
  listReceipts,
  listReceiptsPage
} from "./receipt.services";
import type { ReceiptPageResult } from "./receipt.types";
export const receiptQueryKey = ["billing", "receipts"] as const;
export function useReceiptList() {
  return useQuery({ queryFn: listReceipts, queryKey: receiptQueryKey });
}
export function useReceiptPage(query: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}) {
  const search = useDebouncedValue(query.search);
  const request = { ...query, search };
  return useQuery<ReceiptPageResult>({
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => listReceiptsPage(request, signal),
    queryKey: [...receiptQueryKey, "page", request]
  });
}
export function useReceiptContext() {
  return useQuery({ queryFn: getReceiptContext, queryKey: [...receiptQueryKey, "context"] });
}
export function useReceiptActivity(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => listReceiptActivity(id),
    queryKey: [...receiptQueryKey, id, "activity"]
  });
}
export function useReceiptFormLookups(customerId: number) {
  const contacts = useQuery({
    queryFn: listReceiptContacts,
    queryKey: [...receiptQueryKey, "contacts"]
  });
  const ledgers = useQuery({
    queryFn: listReceiptLedgers,
    queryKey: [...receiptQueryKey, "ledgers"]
  });
  const allocations = useQuery({
    enabled: customerId > 0,
    queryFn: () => listReceiptAllocations(customerId),
    queryKey: [...receiptQueryKey, "allocations", customerId]
  });
  return { allocations, contacts, ledgers };
}
