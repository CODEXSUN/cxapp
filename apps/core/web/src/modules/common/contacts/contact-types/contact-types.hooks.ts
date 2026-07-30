import { useQuery } from "@tanstack/react-query";
import { listContactTypes } from "./contact-types.services";
import type { ContactTypesListFilters } from "./contact-types.types";

export const contactTypesQueryKey = ["core", "common", "contacts", "contact-types"] as const;
export function useContactTypes(filters: ContactTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listContactTypes(filters),
    queryKey: [...contactTypesQueryKey, filters.search ?? ""]
  });
}
