import { useQuery } from "@tanstack/react-query";
import { listContactGroups } from "./contact-groups.services";
import type { ContactGroupsListFilters } from "./contact-groups.types";

export const contactGroupsQueryKey = ["core", "common", "contacts", "contact-groups"] as const;
export function useContactGroups(filters: ContactGroupsListFilters = {}) {
  return useQuery({
    queryFn: () => listContactGroups(filters),
    queryKey: [...contactGroupsQueryKey, filters.search ?? ""]
  });
}
