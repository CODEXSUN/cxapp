import { useQuery } from "@tanstack/react-query";
import {
  getReceiptContext,
  listReceiptActivity,
  listReceiptAllocations,
  listReceiptContacts,
  listReceiptLedgers,
  listReceipts,
  listReceiptsPage
} from "./receipt.services";
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
  return useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => listReceiptsPage(query),
    queryKey: [...receiptQueryKey, "page", query]
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
