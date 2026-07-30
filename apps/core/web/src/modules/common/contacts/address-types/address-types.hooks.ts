import { useQuery } from "@tanstack/react-query";
import { listAddressTypes } from "./address-types.services";
import type { AddressTypesListFilters } from "./address-types.types";

export const addressTypesQueryKey = ["core", "common", "contacts", "address-types"] as const;
export function useAddressTypes(filters: AddressTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listAddressTypes(filters),
    queryKey: [...addressTypesQueryKey, filters.search ?? ""]
  });
}
