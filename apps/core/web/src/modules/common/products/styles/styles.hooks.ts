import { useQuery } from "@tanstack/react-query";
import { listStyles } from "./styles.services";
import type { StylesListFilters } from "./styles.types";

export const stylesQueryKey = ["core", "common", "products", "styles"] as const;
export function useStyles(filters: StylesListFilters = {}) {
  return useQuery({
    queryFn: () => listStyles(filters),
    queryKey: [...stylesQueryKey, filters.search ?? ""]
  });
}
