import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIndustry, listIndustries, updateIndustry } from "./industry.services";
import type { IndustrySavePayload } from "./industry.types";
export const industryQueryKey = ["admin", "industries"] as const;
export function useIndustriesQuery() {
  return useQuery({ queryFn: listIndustries, queryKey: industryQueryKey });
}
export function useIndustryMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: industryQueryKey });
  return {
    create: useMutation({ mutationFn: createIndustry, onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: IndustrySavePayload }) =>
        updateIndustry(id, payload),
      onSuccess: done
    })
  };
}
