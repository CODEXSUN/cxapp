import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listContactLookups, listContacts } from "./contact.services";

export const contactsQueryKey = ["core", "master", "contacts"] as const;
export const contactLookupsQueryKey = ["core", "master", "contacts", "lookups"] as const;

export function useContacts(search = "") {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listContacts(search),
    queryKey: [...contactsQueryKey, search]
  });
}

export function useContactLookups() {
  return useQuery({
    queryFn: listContactLookups,
    queryKey: contactLookupsQueryKey
  });
}
